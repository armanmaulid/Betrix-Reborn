export const billingKeys = {
  all: ['billing'] as const,
  vouchers: (params?: Record<string, unknown>) => ['billing', 'vouchers', params ?? {}] as const
};
