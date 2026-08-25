import { IHistoricalProvider, IMarketCacheStore, OHLCBar } from '@betrix/domain';

/**
 * Infrastructure adapter that wraps an IHistoricalProvider with D1 Redis caching.
 *
 * Implements the IHistoricalProvider port so the application layer can consume it
 * without knowing about Redis or caching strategy. This keeps MarketDataService
 * free of infrastructure concerns (DDD Phase C remediation).
 *
 * Caching Strategy (ADR-27):
 * - Only D1 candles are cached in Redis for 24h % change calculation
 * - All other timeframes are fetched on-demand from the historical source
 * - Cache TTL is dynamically aligned with broker midnight rollover
 */
export class CachedMarketDataProvider implements IHistoricalProvider {
  constructor(
    private readonly historicalProvider: IHistoricalProvider,
    private readonly cacheStore: IMarketCacheStore
  ) {}

  async fetchHistory(
    symbol: string,
    timeframe: string,
    fromDate: Date,
    toDate: Date
  ): Promise<OHLCBar[]> {
    const tfLower = timeframe.toLowerCase();

    // Invariant (ADR-27): Only D1 candles are cached in Redis
    if (tfLower === 'd1') {
      // Try cache first — if we have enough bars, return directly
      const cached = await this.cacheStore.getOHLC(symbol, 'd1');
      if (cached && cached.length > 0) {
        return cached;
      }
    }

    // Fetch from the actual historical data source
    const bars = await this.historicalProvider.fetchHistory(symbol, tfLower, fromDate, toDate);

    // If timeframe is D1 and we got results, cache them (fire-and-forget)
    if (tfLower === 'd1' && bars.length > 0) {
      await this.cacheStore.cacheOHLC(symbol, 'd1', bars).catch((err) => {
        console.warn(
          `[CachedMarketDataProvider] Failed to cache D1 OHLC for ${symbol}:`,
          err.message
        );
      });
    }

    return bars;
  }
}
