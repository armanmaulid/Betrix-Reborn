export const calendarKeys = {
  all: ['calendar'] as const,
  feed: (params?: Record<string, unknown>) => ['calendar', 'feed', params ?? {}] as const
};
