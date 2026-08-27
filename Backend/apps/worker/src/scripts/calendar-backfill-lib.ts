import pino from 'pino';
import { env } from '@betrix/config';
import {
  createPgPool,
  createDrizzleClient,
  DrizzleCalendarRepository,
  FxMacroDataClient
} from '@betrix/infra';
import { joinWithAnnouncementsAndPredictions } from '../shared/calendar-mapping.js';

export interface BackfillResult {
  inserted: number;
  skippedExisting: number;
  indicatorsProcessed: number;
}

/**
 * Backfill logic factored out of the CLI entrypoint (calendar-backfill.ts)
 * so it is independently testable and reuses the exact same
 * joinWithAnnouncementsAndPredictions logic CalendarWorker's daily sync
 * uses — no separate "backfill version" of the mapping/join rules.
 *
 * FXMacroData's free tier is capped at 100 requests/day: if the number of
 * unique indicators in the requested window would exceed what a single
 * day's quota allows, this does NOT force completion in one run — it
 * processes as many indicators as it safely can and returns, so the
 * operator can re-run the same command the next day to continue (already
 * backfilled rows are skipped via onConflictDoNothing, so re-running is
 * always safe).
 */
export class BackfillableCalendarSync {
  private pool = createPgPool(env.DATABASE_URL, 5);
  private calendarRepo: DrizzleCalendarRepository;
  private fxMacroData = new FxMacroDataClient();

  constructor(private readonly logger: pino.Logger) {
    const db = createDrizzleClient(this.pool);
    this.calendarRepo = new DrizzleCalendarRepository(db);
  }

  public async backfillRange(
    currency: string,
    startDate: string,
    endDate: string
  ): Promise<BackfillResult> {
    this.logger.info(
      `Fetching FXMacroData calendar for ${currency.toUpperCase()} (${startDate}..${endDate})...`
    );
    // Pass the range to the API: /v1/calendar returns only UPCOMING releases by
    // default, so a past window would otherwise come back empty.
    const rawEvents = await this.fxMacroData.fetchCalendar(currency, startDate, endDate);

    const eventsInRange = rawEvents.filter((e) => e.date >= startDate && e.date <= endDate);
    this.logger.info(
      `${eventsInRange.length} of ${rawEvents.length} fetched events fall within ${startDate}..${endDate}.`
    );

    if (eventsInRange.length === 0) {
      return { inserted: 0, skippedExisting: 0, indicatorsProcessed: 0 };
    }

    const uniqueIndicatorCount = new Set(eventsInRange.map((e) => e.release)).size;
    this.logger.info(
      `Joining against ${uniqueIndicatorCount} unique indicator(s) (deduplicated across the year)...`
    );

    const events = await joinWithAnnouncementsAndPredictions(
      this.fxMacroData,
      eventsInRange,
      currency,
      this.logger
    );
    const inserted = await this.calendarRepo.saveMany(events);

    return {
      inserted,
      skippedExisting: events.length - inserted,
      indicatorsProcessed: uniqueIndicatorCount
    };
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}
