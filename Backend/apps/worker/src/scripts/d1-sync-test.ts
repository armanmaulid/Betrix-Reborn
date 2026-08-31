/**
 * Manual, one-off invocation of SyncWorker.syncD1Baselines() — for testing
 * the weekend/Monday D1 baseline behavior without waiting for the daily cron
 * to actually fire.
 *
 * Run with: pnpm --filter @betrix/worker exec tsx src/scripts/d1-sync-test.ts
 * (from the Backend directory), or add a "test:d1sync" script to
 * apps/worker/package.json pointing at this file if you'll run it often.
 *
 * Requires Postgres + Redis reachable exactly as the worker normally needs
 * (DATABASE_URL, UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN or their
 * local-dev defaults) — same as running `pnpm dev:sync` normally.
 *
 * This calls syncD1Baselines() directly, bypassing start()/doStart() (no
 * cron scheduling, no leader-election lease) — it's a single synchronous
 * pass through the same logic the cron would run, for every symbol
 * currently marked active in the ohlc_symbols table.
 */
import { logger as baseLogger } from '@betrix/application';
import { SyncWorker } from '../sync-worker.js';

const logger = baseLogger.child({ worker: 'd1-sync-test' });

async function main(): Promise<void> {
  const now = new Date();
  logger.info(
    `[D1 SYNC TEST] Starting manual D1 baseline sync at ${now.toISOString()} (UTC day-of-week: ${now.getUTCDay()}, 0=Sun 6=Sat)...`
  );

  const worker = new SyncWorker();

  try {
    await worker.syncD1Baselines();
    logger.info('[D1 SYNC TEST] Completed — check the [D1 SYNC] lines above for cached values.');
    logger.info(
      '[D1 SYNC TEST] If any symbol logged retries or a final error, that means the expected date and what Dukascopy actually returned did not match within the retry budget — worth a closer look at that symbol specifically.'
    );
  } catch (err: any) {
    logger.error({ err: err.message }, '[D1 SYNC TEST] Unexpected top-level failure');
    process.exitCode = 1;
  } finally {
    // Closes the Postgres pool this worker instance opened in its
    // constructor. Safe to call even though start() was never invoked —
    // releaseLeaderLease() no-ops when no lease was ever acquired.
    await worker.stop();
  }
}

main();
