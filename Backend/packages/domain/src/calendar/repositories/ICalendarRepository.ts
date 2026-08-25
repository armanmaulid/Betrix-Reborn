import { CalendarEvent } from '../entities/CalendarEvent.js';

export interface ICalendarRepository {
  saveMany(events: CalendarEvent[]): Promise<number>;
  /** Upsert used by the SSE handler when a single event's value changes (e.g. release). */
  upsertOne(event: CalendarEvent): Promise<CalendarEvent>;
  findByCurrencyAndMonth(currency: string, yearMonth: string): Promise<CalendarEvent[]>;
  countByCurrencyAndMonth(currency: string, yearMonth: string): Promise<number>;
  findUpcoming(currency: string, limit?: number): Promise<CalendarEvent[]>;
  findByAnnouncementId(announcementId: string): Promise<CalendarEvent | null>;
}
