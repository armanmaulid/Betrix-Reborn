export const analyticsKeys = {
  all: ['analytics'] as const,
  metrics: () => ['analytics', 'metrics'] as const,
  userAnalytics: (params?: Record<string, unknown>) => ['analytics', 'users', params ?? {}] as const
};
