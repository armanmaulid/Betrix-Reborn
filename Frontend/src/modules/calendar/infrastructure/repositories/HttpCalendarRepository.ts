import type {
  ICalendarRepository,
  CalendarQueryParams
} from '../../domain/repositories/ICalendarRepository';
import { CalendarEvent } from '../../domain/entities/CalendarEvent';
import { CalendarMapper } from '../mappers/CalendarMapper';
import { HttpClient } from '@/shared/infrastructure/http/api-client';

export class HttpCalendarRepository implements ICalendarRepository {
  constructor(private http: HttpClient = new HttpClient()) {}

  async getCalendar(params?: CalendarQueryParams): Promise<CalendarEvent[]> {
    const res = await this.http.get<{ data: unknown[] }>('/api/calendar', {
      queryParams: params as Record<string, string | number | boolean | undefined>
    });
    return CalendarMapper.toDomainList(res.data);
  }
}

export const calendarRepository = new HttpCalendarRepository();
