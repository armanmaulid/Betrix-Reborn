import { Nullable, NotFoundError } from '@betrix/core';
import {
  ISymbolRepository,
  IMarketCacheStore,
  IHistoricalProvider,
  Symbol,
  OHLCBar,
  PriceTick,
  MarketTimeCalculator
} from '@betrix/domain';

/**
 * Application service that orchestrates market data operations.
 * Uses only domain ports — zero infrastructure imports (DDD Phase C compliant).
 *
 * Responsibility: coordinate symbol lookups, OHLC fetching, price retrieval,
 * and 24h change calculation. Caching strategy is delegated to adapters.
 */
export class MarketDataService {
  constructor(
    private readonly symbolRepo: ISymbolRepository,
    private readonly cacheStore: IMarketCacheStore,
    private readonly historicalProvider: IHistoricalProvider
  ) {}

  public async getSymbols(activeOnly: boolean = true, category?: string): Promise<Symbol[]> {
    if (category) {
      return this.symbolRepo.findByCategory(category);
    }
    return this.symbolRepo.findAll(activeOnly);
  }

  public async getSymbol(symbol: string): Promise<Nullable<Symbol>> {
    return this.symbolRepo.findBySymbol(symbol.toUpperCase());
  }

  /**
   * Fetch OHLC bars. The historicalProvider may be a CachedMarketDataProvider
   * that handles D1 caching internally — MarketDataService is cache-agnostic.
   */
  public async getOHLC(
    symbol: string,
    timeframe: string = 'h1',
    limit: number = 100
  ): Promise<OHLCBar[]> {
    const symUpper = symbol.toUpperCase();
    const tfLower = timeframe.toLowerCase();

    const now = new Date();
    const lookbackDays = MarketTimeCalculator.calculateLookbackDays(tfLower, limit);
    const fromDate = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

    const bars = await this.historicalProvider.fetchHistory(symUpper, tfLower, fromDate, now);
    return bars.slice(-limit);
  }

  /** Retrieve a single cached price tick by symbol */
  public async getPrice(symbol: string): Promise<Nullable<PriceTick>> {
    return this.cacheStore.getPrice(symbol.toUpperCase());
  }

  /** Retrieve all cached price ticks */
  public async getAllPrices(): Promise<PriceTick[]> {
    return this.cacheStore.getAllPrices();
  }

  /** Delegate to domain entity — PriceTick owns this calculation */
  public calculate24hChange(
    currentPrice: number,
    d1Open: number
  ): { changeAmount: number; changePercent: number } {
    return PriceTick.calculate24hChange(currentPrice, d1Open);
  }
}
