import { CalendarEvent, ICalendarRepository } from '@betrix/domain';

export interface GetCalendarQueryDTO {
  currency?: string;
  /** "YYYY-MM" — when omitted, returns upcoming events instead of a specific month. */
  month?: string;
  limit?: number;
  /**
   * Upcoming mode only: how many days of already-released events to include
   * BEFORE now (0–30). Lets the UI show freshly-released Actual values next
   * to what is still coming, instead of hiding them the instant they pass.
   */
  pastDays?: number;
}

export class GetCalendarUseCase {
  constructor(private readonly calendarRepo: ICalendarRepository) {}

  public async execute(query?: GetCalendarQueryDTO): Promise<CalendarEvent[]> {
    const currency = (query?.currency ?? 'USD').toUpperCase();

    if (query?.month) {
      return this.calendarRepo.findByCurrencyAndMonth(currency, query.month);
    }

    const pastDays = Math.min(30, Math.max(0, Math.floor(query?.pastDays ?? 0)));
    return this.calendarRepo.findUpcoming(currency, query?.limit ?? 50, pastDays);
  }
}
