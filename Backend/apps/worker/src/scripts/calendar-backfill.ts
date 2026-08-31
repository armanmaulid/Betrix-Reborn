/**
 * One-time backfill: fetches the full FXMacroData calendar for every
 * active currency (FXMACRODATA_CALENDAR_CURRENCIES or the legacy
 * FXMACRODATA_CALENDAR_CURRENCY), filters to the previous calendar year,
 * joins with announcements (Before/Actual) and predictions (Forecast),
 * and saves everything to `calendar_events`.
 *
 * The previous calendar year (e.g. in 2026 -> 2025-01-01..2025-12-31) is
 * computed dynamically so the window never goes stale. FXMacroData's
 * /v1/calendar has no prior-year history, so this is driven by
 * /v1/announcements (historical values) inside the lib.
 *
 * Run with: `pnpm --filter @betrix/worker calendar:backfill`.
 *
 * NOT part of CalendarWorker's daily sync -- this is a manual, one-time
 * operation. Safe to re-run: saveMany uses onConflictDoUpdate for values
 * and onConflictDoNothing for schedule rows, so already-backfilled rows are
 * simply skipped/overwritten.
 */
import { logger as baseLogger } from '@betrix/application';
import { BackfillableCalendarSync } from './calendar-backfill-lib.js';
import { activeCalendarCurrencies } from '../shared/fxmacrodata-helpers.js';

const logger = baseLogger.child({ worker: 'calendar-backfill' });

// Previous calendar year (e.g. in 2026 -> 2025-01-01..2025-12-31), computed
// dynamically so it never goes stale. Driven by /v1/announcements because
// /v1/calendar has no prior-year history.
const _now = new Date();
const BACKFILL_START = `${_now.getUTCFullYear() - 1}-01-01`;
const BACKFILL_END = `${_now.getUTCFullYear() - 1}-12-31`;

async function main(): Promise<void> {
  const currencies = activeCalendarCurrencies();
  const sync = new BackfillableCalendarSync(logger);
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalIndicators = 0;
  try {
    for (const currency of currencies) {
      try {
        const result = await sync.backfillRange(currency, BACKFILL_START, BACKFILL_END);
        totalInserted += result.inserted;
        totalSkipped += result.skippedExisting;
        totalIndicators += result.indicatorsProcessed;
        logger.info(
          `[BACKFILL] ${currency.toUpperCase()} inserted=${result.inserted} skipped=${result.skippedExisting} indicatorsProcessed=${result.indicatorsProcessed}`
        );
      } catch (err: any) {
        // Per-currency failure: log and continue with next currency so a
        // single 4xx (e.g. non-USD without a paid key) doesn't abort the run.
        logger.error(
          { err: err.message, currency },
          `Backfill failed for ${currency.toUpperCase()} - continuing with next`
        );
      }
    }
    logger.info(
      `[BACKFILL COMPLETE] currencies=${currencies.length} window=${BACKFILL_START}..${BACKFILL_END} inserted=${totalInserted} skipped=${totalSkipped} indicatorsProcessed=${totalIndicators}`
    );
  } catch (err: any) {
    logger.error({ err: err.message }, 'Backfill run failed');
    process.exitCode = 1;
  } finally {
    await sync.close();
  }
}

main();
