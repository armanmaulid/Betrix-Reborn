'use client';

import { useQuery } from '@tanstack/react-query';
import { calendarRepository } from '@calendar/infrastructure/repositories/HttpCalendarRepository';
import { calendarKeys } from '@calendar/application/calendar.keys';
import type { CalendarEvent } from '@calendar/domain/entities/CalendarEvent';
import type { CalendarQueryParams } from '@calendar/domain/repositories/ICalendarRepository';

export function useCalendarQuery(params?: CalendarQueryParams) {
  return useQuery<CalendarEvent[]>({
    queryKey: calendarKeys.feed(params as Record<string, unknown>),
    queryFn: () => calendarRepository.getCalendar(params),
    staleTime: 60 * 1000
  });
}
