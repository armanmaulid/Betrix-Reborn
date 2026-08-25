export const operationsKeys = {
  all: ['operations'] as const,
  auditLogs: (params?: Record<string, unknown>) =>
    ['operations', 'audit-logs', params ?? {}] as const,
  workers: () => ['operations', 'workers'] as const
};
