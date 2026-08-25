import { CalendarEvent } from '../entities/CalendarEvent';

export interface CalendarQueryParams {
  currency?: string;
  /** "YYYY-MM" — when omitted, the backend returns upcoming events instead. */
  month?: string;
  limit?: number;
}

export interface ICalendarRepository {
  getCalendar(params?: CalendarQueryParams): Promise<CalendarEvent[]>;
}
