/**
 * One-time backfill: fetches the full FXMacroData calendar for
 * `env.FXMACRODATA_CALENDAR_CURRENCY`, filters to the 2026-01-01..2026-12-31
 * window, joins with announcements (Before/Actual) and predictions
 * (Forecast), and saves everything to `calendar_events`.
 *
 * Deduplicates by eventCode before fetching announcements/predictions —
 * one indicator (e.g. non_farm_payrolls) recurs many times a year but is
 * only fetched once, to stay within FXMacroData's 100 req/day free-tier
 * limit. Run with: `pnpm --filter @betrix/worker calendar:backfill`.
 *
 * NOT part of CalendarWorker's daily sync — this is a manual, one-time
 * operation. Safe to re-run: `saveMany` uses onConflictDoNothing, so
 * already-backfilled rows are simply skipped.
 */
import pino from 'pino';
import { env } from '@betrix/config';
import { BackfillableCalendarSync } from './calendar-backfill-lib.js';

const logger = pino({
  level: env.LOG_LEVEL || 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } }
});

// Backfill the PREVIOUS calendar year (e.g. in 2026 → 2025-01-01..2025-12-31),
// computed dynamically so it never goes stale. FXMacroData's /v1/calendar has
// no prior-year history, so this is driven by /v1/announcements (historical
// values), handled inside BackfillableCalendarSync.backfillRange.
const _now = new Date();
const BACKFILL_START = `${_now.getUTCFullYear() - 1}-01-01`;
const BACKFILL_END = `${_now.getUTCFullYear() - 1}-12-31`;

async function main(): Promise<void> {
  const sync = new BackfillableCalendarSync(logger);
  try {
    const result = await sync.backfillRange(
      env.FXMACRODATA_CALENDAR_CURRENCY,
      BACKFILL_START,
      BACKFILL_END
    );
    logger.info(
      `[BACKFILL COMPLETE] currency=${env.FXMACRODATA_CALENDAR_CURRENCY.toUpperCase()} inserted=${result.inserted} skipped=${result.skippedExisting} indicatorsProcessed=${result.indicatorsProcessed}`
    );
  } catch (err: any) {
    logger.error({ err: err.message }, 'Backfill failed');
    process.exitCode = 1;
  } finally {
    await sync.close();
  }
}

main();
