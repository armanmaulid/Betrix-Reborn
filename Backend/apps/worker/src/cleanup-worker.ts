import cron, { ScheduledTask } from 'node-cron';
import pino from 'pino';
import { env } from '@betrix/config';
import {
  createPgPool,
  createDrizzleClient,
  createRedisClient,
  DrizzleSessionRepository,
  DrizzleVerificationRepository,
  DrizzleLoginAttemptRepository,
  DrizzleWorkerStateRepository,
  DrizzleAnalyticsRepository,
  DrizzleStreamSymbolRepository,
  RedisMarketCacheStore,
  RedisWorkerCommandBus
} from '@betrix/infra';
import { SystemCleanupUseCase } from '@betrix/application';
import type { IManagedWorker, WorkerHealthSnapshot } from '@betrix/application';
import { ManagedWorkerBase } from './shared/ManagedWorkerBase.js';

const logger = pino({
  level: env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

export class CleanupWorker extends ManagedWorkerBase implements IManagedWorker {
  private cronJob: ScheduledTask | null = null;
  private isShuttingDown = false;
  private isPaused = false;
  private pool: ReturnType<typeof createPgPool>;
  private cleanupUseCase: SystemCleanupUseCase;
  private analyticsRepo: DrizzleAnalyticsRepository;
  private streamSymbolRepo: DrizzleStreamSymbolRepository;
  private marketStore: RedisMarketCacheStore;
  private processedCount = 0;
  private errorCount = 0;
  private lastError: string | null = null;

  constructor() {
    const redis = createRedisClient();
    const pool = createPgPool(env.DATABASE_URL, 5);
    const db = createDrizzleClient(pool);
    super(
      'maintenance-cleanup-worker',
      new RedisWorkerCommandBus(redis),
      new DrizzleWorkerStateRepository(db),
      logger
    );

    this.pool = pool;
    const sessionRepo = new DrizzleSessionRepository(db);
    const verificationRepo = new DrizzleVerificationRepository(db);
    const loginAttemptRepo = new DrizzleLoginAttemptRepository(db);
    // T1.2 — owns the usage_daily rollup (rolling window upsert each tick).
    this.analyticsRepo = new DrizzleAnalyticsRepository(db);

    this.cleanupUseCase = new SystemCleanupUseCase(sessionRepo, verificationRepo, loginAttemptRepo);

    // T2.4 — owns market price-hash pruning (stale/deactivated symbols).
    this.streamSymbolRepo = new DrizzleStreamSymbolRepository(db);
    this.marketStore = new RedisMarketCacheStore(createRedisClient());
  }

  public async start(): Promise<void> {
    if (await this.wasDeliberatelyHalted()) {
      logger.info('Cleanup Worker was previously paused/stopped by an admin — not auto-starting.');
      return;
    }
    await this.runAsLeaderOrStandby();
  }

  protected async doStart(): Promise<void> {
    logger.info('Starting Maintenance & System Cleanup Worker...');
    this.isPaused = false;

    // Initial immediate cleanup
    await this.runCleanup();

    // Schedule hourly cleanup at top of every hour (0 * * * *)
    this.cronJob = cron.schedule('0 * * * *', async () => {
      if (this.isPaused) return;
      logger.info('[CRON] Executing Scheduled Hourly Maintenance Cleanup...');
      await this.runCleanup();
    });

    this.attachCommandListener();
    logger.info('Maintenance Cleanup Worker scheduled to run hourly (0 * * * *).');
  }

  private cleanupRunning = false;
  public async runCleanup(): Promise<void> {
    if (this.cleanupRunning) return;
    this.cleanupRunning = true;
    try {
      logger.info('Executing system purge for expired tokens, sessions, and old login attempts...');
      const result = await this.cleanupUseCase.execute({ olderThanDays: 30 });
      this.processedCount +=
        result.expiredSessionsDeleted +
        result.expiredTokensDeleted +
        result.oldLoginAttemptsDeleted;
      logger.info(
        `[CLEANUP COMPLETED] Expired Sessions Purged: ${result.expiredSessionsDeleted}, Expired Tokens Purged: ${result.expiredTokensDeleted}, Old Login Attempts Purged: ${result.oldLoginAttemptsDeleted}`
      );

      // T1.2 — keep usage_daily warm so analytics never scans chat_messages.
      const rolled = await this.analyticsRepo.upsertRecentUsageDaily(3);
      if (rolled > 0) logger.info(`[USAGE ROLLUP] ${rolled} day/agent row(s) refreshed.`);

      // T2.4 — prune price hash fields for symbols no longer active.
      const activeSymbols = await this.streamSymbolRepo.findActive();
      const pruned = await this.marketStore.prunePrices(activeSymbols.map((s) => s.symbol));
      if (pruned > 0) logger.info(`[MARKET PRUNE] Removed ${pruned} stale price field(s).`);
    } catch (err: any) {
      this.errorCount += 1;
      this.lastError = err.message;
      logger.error({ err: err.message }, 'Failed to execute maintenance cleanup');
    } finally {
      this.cleanupRunning = false;
    }
  }

  /**
   * A cron-only worker has no persistent connection to keep alive, so `pause()`
   * here means "skip the next scheduled run until resumed" — the cron job
   * itself keeps ticking, but `runCleanup()` is skipped while paused.
   */
  protected async doPause(): Promise<void> {
    this.isPaused = true;
    logger.info('Cleanup Worker paused — scheduled runs will be skipped until resumed.');
  }

  protected async doStop(): Promise<void> {
    this.isPaused = false;
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.detachCommandListener();
    logger.info('Cleanup Worker cron stopped.');
  }

  protected async doRestart(): Promise<void> {
    await this.doStop();
    await this.doStart();
  }

  public getHealth(): WorkerHealthSnapshot {
    return {
      status: this.isPaused ? 'paused' : this.cronJob ? 'running' : 'stopped',
      processedCount: this.processedCount,
      errorCount: this.errorCount,
      lastError: this.lastError
    };
  }

  public async stop(): Promise<void> {
    this.isShuttingDown = true;
    await this.releaseLeaderLease();
    await this.doStop();
    await this.pool.end();
    logger.info('Cleanup Worker stopped cleanly.');
  }

  public async restart(): Promise<void> {
    await this.doRestart();
  }

  public async pause(): Promise<void> {
    await this.doPause();
  }
}

// Direct CLI entrypoint execution
const isDirectExecution =
  process.argv[1]?.endsWith('cleanup-worker.ts') || process.argv[1]?.endsWith('cleanup-worker.js');
if (isDirectExecution) {
  const worker = new CleanupWorker();

  const shutdown = async () => {
    logger.info('Received shutdown signal. Stopping Cleanup Worker...');
    await worker.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  worker.start().catch((err) => {
    logger.error(err, 'Failed to start Cleanup Worker');
    process.exit(1);
  });
}
