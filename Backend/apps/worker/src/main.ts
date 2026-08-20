import pino from 'pino';
import { env } from '@betrix/config';
import { FinnhubWsWorker } from './ws-worker.js';
import { NewsWorker } from './news-worker.js';
import { SyncWorker } from './sync-worker.js';
import { CleanupWorker } from './cleanup-worker.js';

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

  const shutdown = async () => {
    logger.info('Received termination signal. Gracefully stopping all workers...');
    await Promise.allSettled([
      wsWorker.stop(),
      newsWorker.stop(),
      syncWorker.stop(),
      cleanupWorker.stop()
    ]);
    logger.info('All workers stopped. Exiting cleanly.');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    // Start all 4 workers concurrently
    await Promise.all([
      wsWorker.start(),
      newsWorker.start(),
      syncWorker.start(),
      cleanupWorker.start()
    ]);

    logger.info(' All 4 Worker subsystems are running actively in the background.');
  } catch (err: any) {
    logger.error({ err: err.message }, 'Fatal error during worker startup');
    process.exit(1);
  }
}

startMasterWorker().catch((err) => {
  logger.error(err, 'Unhandled error during worker execution');
  process.exit(1);
});
