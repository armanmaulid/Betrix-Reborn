import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import { env } from '@betrix/config';
import {
  RedisWorkerCommandBus,
  DrizzleWorkerStateRepository,
  createRedisClient,
  redisKeys,
  type WorkerCommandMessage
} from '@betrix/infra';
import type { WorkerHealthSnapshot } from '@betrix/application';
import type { WorkerAction } from '@betrix/domain';

/**
 * Shared plumbing every worker in `apps/worker` needs to be admin-controllable:
 * subscribe to its Redis command channel, dispatch pause/stop/restart/start
 * to the concrete worker's own implementation, publish a report back after
 * each command, and persist the report into `worker_states` (the SSOT that
 * `main.ts` reads on boot — see IWorkerStateRepository doc comment).
 *
 * T6.1 Leader lease: only ONE process may run a given workerId at a time.
 * Leadership is a Redis lease (`SET NX PX`, renewed every 30s, TTL 90s);
 * followers stay in standby polling until it frees. Release uses a
 * compare-and-delete Lua script so an expired-but-recycled lease can never
 * be deleted by the wrong instance.
 *
 * T6.5 Dispatch serialization: commands execute strictly one-at-a-time via a
 * promise chain, so rapid restart/start pairs can no longer create duplicate
 * cron timers (the old interleaving bug).
 */
export abstract class ManagedWorkerBase {
  private unsubscribeCommands: (() => void) | null = null;
  private dispatchChain: Promise<void> = Promise.resolve();

  // ── Leader lease state (T6.1) ──
  private readonly instanceId = randomUUID();
  private leaseRedis: ReturnType<typeof createRedisClient> | null = null;
  private leaseAcquired = false;
  private leaseRenewTimer: NodeJS.Timeout | null = null;
  private leasePollTimer: NodeJS.Timeout | null = null;
  private static readonly LEASE_TTL_MS = env.WORKER_LEASE_TTL_MS;
  private static readonly LEASE_RENEW_MS = 30_000;
  private static readonly LEASE_POLL_MS = 30_000;
  /** Set true by stop paths so standby polling stops promptly. */
  protected isShuttingDownLease = false;

  constructor(
    public readonly workerId: string,
    private readonly commandBus: RedisWorkerCommandBus,
    private readonly workerStateRepo: DrizzleWorkerStateRepository,
    protected readonly logger: Logger
  ) {}

  protected abstract doStart(): Promise<void>;
  protected abstract doPause(): Promise<void>;
  protected abstract doStop(): Promise<void>;
  protected abstract doRestart(): Promise<void>;
  public abstract getHealth(): WorkerHealthSnapshot;

  /**
   * T6.1 — call instead of `this.doStart()` from each worker's public
   * `start()` and reconnect paths. Acquires the leader lease (standby-polls
   * while another instance holds it), then runs the real start flow.
   * Fire-and-forget by design: callers must not block on standby polling.
   */
  protected runAsLeaderOrStandby(): void {
    void this.acquireThenRun();
  }

  private async acquireThenRun(): Promise<void> {
    let standbyPolls = 0;
    // Only every Nth poll gets a log line while parked in standby — a
    // legitimate standby (a second instance running for redundancy) can
    // stay here indefinitely, and logging every single 30s poll turns into
    // hundreds of identical lines an hour for no new information. The first
    // poll always logs immediately so standby entry is never silent.
    const STANDBY_LOG_EVERY_N_POLLS = 10; // ~5 min at the 30s poll interval

    for (;;) {
      if (this.isShuttingDownLease) return;
      if (await this.tryAcquireLease()) break;

      if (standbyPolls % STANDBY_LOG_EVERY_N_POLLS === 0) {
        this.logger.info(
          { workerId: this.workerId },
          'Leader lease held elsewhere — standing by (polling every 30s)...'
        );
      }
      standbyPolls += 1;
      // Standby deliberately does NOT heartbeat: the key is owned by the
      // active leader, and zero-counter standbys must not flap the panel.
      await new Promise((r) => setTimeout(r, ManagedWorkerBase.LEASE_POLL_MS));
    }

    this.startLeaseRenewLoop();
    try {
      await this.doStart();
    } catch (err: any) {
      this.logger.error(
        { err: err.message, workerId: this.workerId },
        'Leader start flow failed — releasing lease'
      );
      await this.releaseLeaderLease();
      throw err;
    }
  }

  private async tryAcquireLease(): Promise<boolean> {
    this.leaseRedis ??= createRedisClient();
    const key = redisKeys.workerLease(this.workerId);
    const ok = await this.leaseRedis.set(key, this.instanceId, {
      nx: true,
      px: ManagedWorkerBase.LEASE_TTL_MS
    });
    const acquired = ok === 'OK';
    if (acquired) this.leaseAcquired = true;
    return acquired;
  }

  /**
   * T3.3 — live telemetry heartbeat (Redis, TTL 90s). Written by leaders on
   * renewal AND by standbys while polling, so /admin/workers can overlay
   * fresh counters without touching Postgres.
   */
  protected async writeHeartbeat(): Promise<void> {
    try {
      this.leaseRedis ??= createRedisClient();
      const h = this.getHealth();
      await this.leaseRedis.set(
        redisKeys.workerHeartbeat(this.workerId),
        JSON.stringify({
          processedCount: h.processedCount,
          errorCount: h.errorCount,
          lastError: h.lastError,
          ts: Date.now()
        }),
        { ex: 90 }
      );
    } catch {
      // Heartbeat is best-effort.
    }
  }

  private startLeaseRenewLoop(): void {
    if (this.leaseRenewTimer) return;
    this.leaseRenewTimer = setInterval(async () => {
      await this.writeHeartbeat();
      try {
        this.leaseRedis ??= createRedisClient();
        const key = redisKeys.workerLease(this.workerId);
        const current = await this.leaseRedis.get<string>(key);
        if (current !== this.instanceId) {
          this.logger.error(
            { workerId: this.workerId },
            'Leader lease lost — stepping down (timers stopped via doStop).'
          );
          this.stopRenewLoop();
          this.leaseAcquired = false;
          await this.doStop().catch(() => undefined);
          this.runAsLeaderOrStandby(); // re-enter standby polling
          return;
        }
        await this.leaseRedis.expire(key, Math.ceil(ManagedWorkerBase.LEASE_TTL_MS / 1000));
      } catch {
        // Transient Redis error — TTL gives us slack before takeover.
      }
    }, ManagedWorkerBase.LEASE_RENEW_MS);
  }

  private stopRenewLoop(): void {
    if (this.leaseRenewTimer) {
      clearInterval(this.leaseRenewTimer);
      this.leaseRenewTimer = null;
    }
  }

  /**
   * Compare-and-delete release (Lua) — safe against deleting a lease that has
   * already expired and been taken over by another instance.
   */
  protected async releaseLeaderLease(): Promise<void> {
    if (!this.leaseAcquired && !this.leaseRenewTimer) return;
    this.stopRenewLoop();
    this.leaseAcquired = false;
    try {
      this.leaseRedis ??= createRedisClient();
      const key = redisKeys.workerLease(this.workerId);
      await this.leaseRedis.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end",
        [key],
        [this.instanceId]
      );
    } catch {
      // Best-effort: TTL expiry is the safety net.
    }
  }

  /**
   * Call once from the concrete worker's own `start()`, after its internal
   * state (cron job, connection, etc.) is ready to receive commands.
   */
  protected attachCommandListener(): void {
    this.unsubscribeCommands = this.commandBus.subscribeCommands(this.workerId, (cmd) => {
      // T6.5 — serialize dispatches: two rapid commands can no longer
      // interleave at the first await and create double timers.
      this.dispatchChain = this.dispatchChain
        .then(() => this.dispatchCommand(cmd))
        .catch(() => undefined);
    });
  }

  /** Call once from the concrete worker's own `stop()`. */
  protected detachCommandListener(): void {
    this.unsubscribeCommands?.();
    this.unsubscribeCommands = null;
  }

  private async dispatchCommand(cmd: WorkerCommandMessage): Promise<void> {
    try {
      switch (cmd.action) {
        case 'start':
          await this.doStart();
          break;
        case 'pause':
          await this.doPause();
          break;
        case 'stop':
          await this.doStop();
          break;
        case 'restart':
          await this.doRestart();
          break;
      }
    } catch (err: any) {
      this.logger.error(
        { err: err.message, workerId: this.workerId },
        'Failed to execute admin command'
      );
    }
    await this.reportHealth();
  }

  /**
   * Publishes live telemetry to Redis and persists counters into
   * worker_states. T6.5: telemetry NEVER overwrites `status` — status is
   * owned exclusively by admin commands (`recordCommand`) so a slow report
   * can no longer flip running/paused after a newer command.
   */
  protected async reportHealth(): Promise<void> {
    const health = this.getHealth();
    await this.commandBus.publishReport(this.workerId, {
      status: health.status,
      processedCount: health.processedCount,
      errorCount: health.errorCount,
      lastError: health.lastError,
      timestamp: Date.now()
    });
    await this.workerStateRepo.recordReportTelemetry(
      this.workerId,
      health.processedCount,
      health.errorCount,
      health.lastError
    );
  }

  /**
   * Read from `worker_states` (SSOT) to decide whether this worker should
   * auto-start on process boot. Returns true if the last recorded command
   * was 'pause' or 'stop' — meaning the worker was deliberately taken down
   * by an admin and a process restart must not silently override that.
   */
  public async wasDeliberatelyHalted(): Promise<boolean> {
    const record = await this.workerStateRepo.findByWorkerId(this.workerId);
    return record?.status === 'paused' || record?.status === 'stopped';
  }
}

export type { WorkerCommandMessage, WorkerAction };
