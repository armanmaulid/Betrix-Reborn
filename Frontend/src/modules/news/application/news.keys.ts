export const newsKeys = {
  all: ['news'] as const,
  feed: (params?: Record<string, unknown>) => ['news', 'feed', params ?? {}] as const
};
