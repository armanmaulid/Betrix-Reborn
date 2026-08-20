import cron, { ScheduledTask } from 'node-cron';
import pino from 'pino';
import { env } from '@betrix/config';
import {
  createPgPool,
  createDrizzleClient,
  createRedisClient,
  DrizzleSessionRepository,
  DrizzleVerificationRepository,
  DrizzleLoginAttemptRepository
} from '@betrix/infra';
import { SystemCleanupUseCase } from '@betrix/application';

const logger = pino({
  level: env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

export class CleanupWorker {
  private cronJob: ScheduledTask | null = null;
  private isShuttingDown = false;
  private pool = createPgPool(env.DATABASE_URL, 5);
  private cleanupUseCase: SystemCleanupUseCase;

  constructor() {
    const db = createDrizzleClient(this.pool);
    const sessionRepo = new DrizzleSessionRepository(db);
    const verificationRepo = new DrizzleVerificationRepository(db);
    const loginAttemptRepo = new DrizzleLoginAttemptRepository(db);

    this.cleanupUseCase = new SystemCleanupUseCase(sessionRepo, verificationRepo, loginAttemptRepo);
  }

  public async start(): Promise<void> {
    logger.info('Starting Maintenance & System Cleanup Worker...');

    // Initial immediate cleanup
    await this.runCleanup();

    // Schedule hourly cleanup at top of every hour (0 * * * *)
    this.cronJob = cron.schedule('0 * * * *', async () => {
      logger.info('[CRON] Executing Scheduled Hourly Maintenance Cleanup...');
      await this.runCleanup();
    });

    logger.info('Maintenance Cleanup Worker scheduled to run hourly (0 * * * *).');
  }

  public async runCleanup(): Promise<void> {
    try {
      logger.info('Executing system purge for expired tokens, sessions, and old login attempts...');
      const result = await this.cleanupUseCase.execute({ olderThanDays: 30 });
      logger.info(
        `[CLEANUP COMPLETED] Expired Sessions Purged: ${result.expiredSessionsDeleted}, Expired Tokens Purged: ${result.expiredTokensDeleted}, Old Login Attempts Purged: ${result.oldLoginAttemptsDeleted}`
      );
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to execute maintenance cleanup');
    }
  }

  public async stop(): Promise<void> {
    this.isShuttingDown = true;
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    await this.pool.end();
    logger.info('Cleanup Worker stopped cleanly.');
  }
}

// Direct CLI entrypoint execution
const isDirectExecution = process.argv[1]?.endsWith('cleanup-worker.ts') || process.argv[1]?.endsWith('cleanup-worker.js');
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
