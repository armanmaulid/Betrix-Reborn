import { CalendarEvent, ICalendarRepository } from '@betrix/domain';
import { ValidationError } from '@betrix/core';

export interface GetCalendarQueryDTO {
  currency?: string;
  /** "YYYY-MM" — when omitted, returns upcoming events instead of a specific month. */
  month?: string;
  /**
   * Full calendar year (e.g. 2025). Takes precedence over month/upcoming and
   * bypasses the 92-day cap (the range is server-computed, so a year-long
   * scan is safe and intentional). Use this to surface a complete prior-year
   * backfill in one call.
   */
  year?: number;
  limit?: number;
  /**
   * Upcoming mode only: how many days of already-released events to include
   * BEFORE now (0–30). Lets the UI show freshly-released Actual values next
   * to what is still coming, instead of hiding them the instant they pass.
   */
  pastDays?: number;
  /**
   * Explicit unix-second window (both required, inclusive). Takes precedence
   * over month/upcoming and powers arbitrary UI presets like Yesterday or
   * This Week. Hard-capped at 92 days so one request cannot scan the table.
   */
  from?: number;
  to?: number;
}

const MAX_RANGE_SECONDS = 92 * 86400;

export class GetCalendarUseCase {
  constructor(private readonly calendarRepo: ICalendarRepository) {}

  public async execute(query?: GetCalendarQueryDTO): Promise<CalendarEvent[]> {
    const currency = (query?.currency ?? 'USD').toUpperCase();

    if (query?.from != null || query?.to != null) {
      const { from, to } = query;
      if (from == null || to == null) {
        throw new ValidationError('Both "from" and "to" are required for a calendar range query.');
      }
      if (to < from) {
        throw new ValidationError('Calendar range "to" must be greater than or equal to "from".');
      }
      if (to - from > MAX_RANGE_SECONDS) {
        throw new ValidationError('Calendar range must not exceed 92 days.');
      }
      return this.calendarRepo.findByCurrencyAndRange(currency, Math.floor(from), Math.floor(to));
    }

    if (query?.year != null) {
      // Server-computed year window — deliberately bypasses the 92-day cap so
      // a full prior-year backfill can be served in one call.
      const year = Math.floor(query.year);
      const startUnix = Math.floor(Date.UTC(year, 0, 1) / 1000);
      const endUnix = Math.floor(Date.UTC(year + 1, 0, 1) / 1000) - 1;
      return this.calendarRepo.findByCurrencyAndRange(currency, startUnix, endUnix);
    }

    if (query?.month) {
      return this.calendarRepo.findByCurrencyAndMonth(currency, query.month);
    }

    const pastDays = Math.min(30, Math.max(0, Math.floor(query?.pastDays ?? 0)));
    return this.calendarRepo.findUpcoming(currency, query?.limit ?? 50, pastDays);
  }
}
