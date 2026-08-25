import { CalendarEvent, ICalendarRepository } from '@betrix/domain';

export interface GetCalendarQueryDTO {
  currency?: string;
  /** "YYYY-MM" — when omitted, returns upcoming events instead of a specific month. */
  month?: string;
  limit?: number;
}

export class GetCalendarUseCase {
  constructor(private readonly calendarRepo: ICalendarRepository) {}

  public async execute(query?: GetCalendarQueryDTO): Promise<CalendarEvent[]> {
    const currency = (query?.currency ?? 'USD').toUpperCase();

    if (query?.month) {
      return this.calendarRepo.findByCurrencyAndMonth(currency, query.month);
    }

    return this.calendarRepo.findUpcoming(currency, query?.limit ?? 50);
  }
}
