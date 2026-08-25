import type { Logger } from 'pino';
import {
  RedisWorkerCommandBus,
  DrizzleWorkerStateRepository,
  type WorkerCommandMessage
} from '@betrix/infra';
import type { WorkerHealthSnapshot } from '@betrix/application';
import type { WorkerAction, WorkerStatus } from '@betrix/domain';

/**
 * Shared plumbing every worker in `apps/worker` needs to be admin-controllable:
 * subscribe to its Redis command channel, dispatch pause/stop/restart/start
 * to the concrete worker's own implementation, publish a report back after
 * each command, and persist the report into `worker_states` (the SSOT that
 * `main.ts` reads on boot — see IWorkerStateRepository doc comment).
 *
 * Concrete workers extend this and implement only the actual start/pause/
 * stop/restart/getHealth behaviour (`doStart`/`doPause`/`doStop`/`doRestart`);
 * this base class owns the command-bus wiring so that behaviour is written
 * exactly once instead of copy-pasted into every worker file.
 */
export abstract class ManagedWorkerBase {
  private unsubscribeCommands: (() => void) | null = null;

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
   * Call once from the concrete worker's own `start()`, after its internal
   * state (cron job, connection, etc.) is ready to receive commands.
   */
  protected attachCommandListener(): void {
    this.unsubscribeCommands = this.commandBus.subscribeCommands(this.workerId, async (cmd) => {
      await this.dispatchCommand(cmd);
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

  /** Publishes current health to Redis and persists it into worker_states (SSOT). */
  protected async reportHealth(): Promise<void> {
    const health = this.getHealth();
    await this.commandBus.publishReport(this.workerId, {
      status: health.status,
      processedCount: health.processedCount,
      errorCount: health.errorCount,
      lastError: health.lastError,
      timestamp: Date.now()
    });
    await this.workerStateRepo.recordReport(
      this.workerId,
      health.status,
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

export type { WorkerCommandMessage, WorkerAction, WorkerStatus };
