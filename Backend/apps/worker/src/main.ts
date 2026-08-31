import { logger as baseLogger } from '@betrix/application';
import { setTimeout } from 'node:timers/promises';
import { FinnhubWsWorker } from './ws-worker.js';
import { NewsWorker } from './news-worker.js';
import { SyncWorker } from './sync-worker.js';
import { CleanupWorker } from './cleanup-worker.js';
import { CalendarWorker } from './calendar-worker.js';
import { CalendarSeederWorker } from './calendar-seeder-worker.js';

const logger = baseLogger.child({ worker: 'master' });

async function startMasterWorker() {
  logger.info('═══════════════════════════════════════════════════════════════');
  logger.info('🚀 Betrix-Reborn Master Worker Application Initializing...');
  logger.info('═══════════════════════════════════════════════════════════════');

  const wsWorker = new FinnhubWsWorker();
  const newsWorker = new NewsWorker();
  const syncWorker = new SyncWorker();
  const cleanupWorker = new CleanupWorker();
  const calendarWorker = new CalendarWorker();
  const calendarSeederWorker = new CalendarSeederWorker();

  const shutdown = async () => {
    logger.info('Received termination signal. Gracefully stopping all workers...');
    await Promise.allSettled([
      wsWorker.stop(),
      newsWorker.stop(),
      syncWorker.stop(),
      cleanupWorker.stop(),
      calendarWorker.stop(),
      calendarSeederWorker.stop()
    ]);

    // T6.7 — grace window so in-flight ticks finish their final DB writes
    // before pools are torn down underneath them.
    await setTimeout(3000);
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
    // Start all 6 workers concurrently. Each worker's own start() checks
    // worker_states (the SSOT — see IWorkerStateRepository) before running:
    // a worker an admin previously paused/stopped does not silently
    // auto-start again just because this process restarted.
    await Promise.all([
      wsWorker.start(),
      newsWorker.start(),
      syncWorker.start(),
      cleanupWorker.start(),
      calendarWorker.start(),
      calendarSeederWorker.start()
    ]);

    logger.info(' All 6 Worker subsystems are running actively in the background.');
  } catch (err: any) {
    logger.error({ err: err.message }, 'Fatal error during worker startup');
    process.exit(1);
  }
}

startMasterWorker().catch((err) => {
  logger.error(err, 'Unhandled error during worker execution');
  process.exit(1);
});
