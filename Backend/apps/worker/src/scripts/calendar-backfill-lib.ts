import pino from 'pino';
import { env } from '@betrix/config';
import {
  createPgPool,
  createDrizzleClient,
  DrizzleCalendarRepository,
  FxMacroDataClient,
  type FxMacroDataAnnouncement
} from '@betrix/infra';
import { eventsFromAnnouncements } from '../shared/calendar-mapping.js';

export interface BackfillResult {
  inserted: number;
  skippedExisting: number;
  indicatorsProcessed: number;
}

/**
 * Backfill logic factored out of the CLI entrypoint (calendar-backfill.ts)
 * so it is independently testable and reuses the exact same mapping rules
 * CalendarWorker's daily sync uses — no separate "backfill version".
 *
 * IMPORTANT: FXMacroData's /v1/calendar only serves ~2 months lookback +
 * forward and returns ZERO rows for any prior calendar year. Historical
 * values live in /v1/announcements (a full time series). So for a PAST range
 * this backs up from announcements: it derives the indicator universe from
 * the current-year calendar (which works), then fetches each indicator's
 * announcements over [startDate, endDate] and builds CalendarEvents from them
 * (joining predictions for forecasts). saveMany's onConflictDoNothing makes
 * re-runs safe and idempotent.
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
    const cur = currency.toLowerCase();

    // Indicator universe: FXMacroData's prior-year calendar is empty, so take
    // the live indicator list from the current-year calendar (which works).
    let indicators: string[] = [];
    try {
      const thisYear = new Date().getUTCFullYear();
      const calendar = await this.fxMacroData.fetchCalendar(
        cur,
        `${thisYear}-01-01`,
        `${thisYear}-12-31`
      );
      indicators = [...new Set(calendar.map((e) => e.release))];
    } catch (err: any) {
      this.logger.warn(
        { err: err.message },
        'Failed to load indicator universe from current-year calendar.'
      );
    }
    if (indicators.length === 0) {
      return { inserted: 0, skippedExisting: 0, indicatorsProcessed: 0 };
    }

    // Fetch the historical ANNOUNCEMENTS (before/actual values) for the range.
    const allAnnouncements: FxMacroDataAnnouncement[] = [];
    for (const indicator of indicators) {
      try {
        const rows = await this.fxMacroData.fetchAnnouncements(cur, indicator, startDate, endDate);
        allAnnouncements.push(...rows);
      } catch (err: any) {
        this.logger.warn(
          { err: err.message },
          `announcements failed for indicator '${indicator}'.`
        );
      }
    }
    this.logger.info(
      `${allAnnouncements.length} announcement rows fetched across ${indicators.length} indicators for ${startDate}..${endDate}.`
    );
    if (allAnnouncements.length === 0) {
      return { inserted: 0, skippedExisting: 0, indicatorsProcessed: indicators.length };
    }

    const events = await eventsFromAnnouncements(
      this.fxMacroData,
      allAnnouncements,
      currency,
      this.logger
    );
    const inserted = await this.calendarRepo.saveMany(events);

    return {
      inserted,
      skippedExisting: events.length - inserted,
      indicatorsProcessed: indicators.length
    };
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}
