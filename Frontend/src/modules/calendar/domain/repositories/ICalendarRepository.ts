import { CalendarEvent } from '../entities/CalendarEvent';

export interface CalendarQueryParams {
  currency?: string;
  /** "YYYY-MM" — when omitted, the backend returns upcoming events instead. */
  month?: string;
  /**
   * Full calendar year (e.g. 2025) — used to surface a complete prior-year
   * backfill in one call. Bypasses the 92-day cap on the from/to range.
   */
  year?: number;
  limit?: number;
  /** Upcoming mode only: include events released within the last N days (0–30). */
  pastDays?: number;
  /** Unix seconds, inclusive pair — powers arbitrary presets (Yesterday, This Week, …). */
  from?: number;
  to?: number;
}

export interface ICalendarRepository {
  getCalendar(params?: CalendarQueryParams): Promise<CalendarEvent[]>;
}
