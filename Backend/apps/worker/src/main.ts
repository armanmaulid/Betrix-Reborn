import pino from 'pino';
import { env } from '@betrix/config';
import { FinnhubWsWorker } from './ws-worker.js';
import { NewsWorker } from './news-worker.js';
import { SyncWorker } from './sync-worker.js';
import { CleanupWorker } from './cleanup-worker.js';
import { CalendarWorker } from './calendar-worker.js';

const logger = pino({
  level: env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

async function startMasterWorker() {
  logger.info('═══════════════════════════════════════════════════════════════');
  logger.info('🚀 Betrix-Reborn Master Worker Application Initializing...');
  logger.info('═══════════════════════════════════════════════════════════════');

  const wsWorker = new FinnhubWsWorker();
  const newsWorker = new NewsWorker();
  const syncWorker = new SyncWorker();
  const cleanupWorker = new CleanupWorker();
  const calendarWorker = new CalendarWorker();

  const shutdown = async () => {
    logger.info('Received termination signal. Gracefully stopping all workers...');
    await Promise.allSettled([
      wsWorker.stop(),
      newsWorker.stop(),
      syncWorker.stop(),
      cleanupWorker.stop(),
      calendarWorker.stop()
    ]);
    logger.info('All workers stopped. Exiting cleanly.');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Process-level safety nets: an unhandled rejection in any background
  // subsystem must be logged, not silently swallowed — and must not take the
  // whole supervisor down without a graceful stop attempt.
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection in worker process');
  });
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception in worker process — initiating shutdown');
    void shutdown();
  });

  try {
    // Start all 5 workers concurrently. Each worker's own start() checks
    // worker_states (the SSOT — see IWorkerStateRepository) before running:
    // a worker an admin previously paused/stopped does not silently
    // auto-start again just because this process restarted.
    await Promise.all([
      wsWorker.start(),
      newsWorker.start(),
      syncWorker.start(),
      cleanupWorker.start(),
      calendarWorker.start()
    ]);

    logger.info(' All 5 Worker subsystems are running actively in the background.');
  } catch (err: any) {
    logger.error({ err: err.message }, 'Fatal error during worker startup');
    process.exit(1);
  }
}

startMasterWorker().catch((err) => {
  logger.error(err, 'Unhandled error during worker execution');
  process.exit(1);
});
