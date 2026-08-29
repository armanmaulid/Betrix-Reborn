'use client';

import { useQuery } from '@tanstack/react-query';
import { calendarRepository } from '@/modules/calendar/infrastructure/repositories/HttpCalendarRepository';
import { calendarKeys } from '@/modules/calendar/application/calendar.keys';
import type { CalendarEvent } from '@/modules/calendar/domain/entities/CalendarEvent';
import type { CalendarQueryParams } from '@/modules/calendar/domain/repositories/ICalendarRepository';

export function useCalendarQuery(params?: CalendarQueryParams) {
  return useQuery<CalendarEvent[]>({
    queryKey: calendarKeys.feed(params as Record<string, unknown>),
    queryFn: () => calendarRepository.getCalendar(params),
    staleTime: 60 * 1000,
    // Poll our own Postgres-backed endpoint once a minute so freshly-released
    // Actual values appear without user interaction. This is cheap for us —
    // the heavy FXMacroData fetching happens in the worker, never here.
    refetchInterval: 60 * 1000
  });
}
