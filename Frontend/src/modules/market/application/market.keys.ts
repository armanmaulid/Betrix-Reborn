export const marketKeys = {
  all: ['market'] as const,
  symbols: (activeOnly?: boolean) => ['market', 'symbols', { activeOnly: Boolean(activeOnly) }] as const,
  streamSymbols: (activeOnly?: boolean) => ['market', 'stream-symbols', { activeOnly: Boolean(activeOnly) }] as const,
  prices: () => ['market', 'prices'] as const
};
