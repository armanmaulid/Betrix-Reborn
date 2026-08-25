import { CalendarEvent } from '../entities/CalendarEvent.js';

export interface ICalendarRepository {
  saveMany(events: CalendarEvent[]): Promise<number>;
  /** Upsert used by the SSE handler when a single event's value changes (e.g. release). */
  upsertOne(event: CalendarEvent): Promise<CalendarEvent>;
  findByCurrencyAndMonth(currency: string, yearMonth: string): Promise<CalendarEvent[]>;
  countByCurrencyAndMonth(currency: string, yearMonth: string): Promise<number>;
  /**
   * Events with announcementUnix >= now, unless pastDays > 0 which widens the
   * lower bound to now - pastDays*86400 so recently-released rows stay visible.
   */
  findUpcoming(currency: string, limit?: number, pastDays?: number): Promise<CalendarEvent[]>;
  /** Rows whose announcementUnix falls inside the inclusive unix-second range. */
  findByCurrencyAndRange(
    currency: string,
    startUnix: number,
    endUnix: number
  ): Promise<CalendarEvent[]>;
  findByAnnouncementId(announcementId: string): Promise<CalendarEvent | null>;
}
