import { PriceTick } from '@betrix/domain';
import { MarketDataService } from '../../services/MarketDataService.js';

export interface EnrichedPriceTick {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  timestamp: number;
  change24hAmount?: number;
  change24hPercent?: number;
}

/**
 * Use case for retrieving market prices enriched with 24h change data.
 * Depends only on MarketDataService — no direct infrastructure access (DDD Phase C).
 */
export class GetPricesUseCase {
  constructor(private readonly marketDataService: MarketDataService) {}

  public async execute(symbol?: string): Promise<EnrichedPriceTick | EnrichedPriceTick[]> {
    if (symbol) {
      const symUpper = symbol.toUpperCase();
      let tick = await this.marketDataService.getPrice(symUpper);

      // On-demand fallback (ADR-27 / ADR-28): If live tick is not in memory relay, query latest on-demand candle
      let d1Open = 0;
      if (!tick) {
        try {
          const latestBars = await this.marketDataService.getOHLC(symUpper, 'm1', 1);
          if (latestBars && latestBars.length > 0) {
            const bar = latestBars[latestBars.length - 1]!;
            tick = new PriceTick({
              symbol: symUpper,
              bid: bar.close,
              ask: bar.close,
              spread: 0,
              volume: bar.volume || 0,
              timestamp: bar.time * 1000
            });
          }
        } catch {
          // Ignore and fallback to 0
        }
      }

      if (!tick) {
        return {
          symbol: symUpper,
          bid: 0,
          ask: 0,
          last: 0,
          timestamp: Math.floor(Date.now() / 1000),
          change24hAmount: 0,
          change24hPercent: 0
        };
      }

      // Check D1 baseline for 24h change calculation (ADR-27)
      try {
        const d1Cached = await this.marketDataService.getOHLC(symUpper, 'd1', 1);
        if (d1Cached && d1Cached.length > 0) {
          d1Open = d1Cached[d1Cached.length - 1]!.open;
        }
      } catch {
        d1Open = tick.last;
      }

      const { changeAmount, changePercent } = this.marketDataService.calculate24hChange(
        tick.last,
        d1Open || tick.last
      );

      return {
        symbol: tick.symbol,
        bid: tick.bid,
        ask: tick.ask,
        last: tick.last,
        timestamp: tick.timestamp,
        change24hAmount: changeAmount,
        change24hPercent: changePercent
      };
    }

    // Return all prices — D1 baselines fetched in parallel
    const allPrices = await this.marketDataService.getAllPrices();

    const enriched = await Promise.all(
      allPrices.map(async (tick) => {
        let d1Open = tick.last;
        try {
          const d1Cached = await this.marketDataService.getOHLC(tick.symbol, 'd1', 1);
          if (d1Cached && d1Cached.length > 0) {
            d1Open = d1Cached[d1Cached.length - 1]!.open;
          }
        } catch {
          // Use tick.last as fallback
        }

        const { changeAmount, changePercent } = this.marketDataService.calculate24hChange(
          tick.last,
          d1Open
        );
        return {
          symbol: tick.symbol,
          bid: tick.bid,
          ask: tick.ask,
          last: tick.last,
          timestamp: tick.timestamp,
          change24hAmount: changeAmount,
          change24hPercent: changePercent
        };
      })
    );

    return enriched;
  }
}
