import { Redis } from '@upstash/redis';
import {
  IMarketCacheStore,
  OHLCBar,
  PriceTick,
  Nullable,
  BrokerTimeCalculator
} from '@betrix/domain';
import { safeJsonParse } from '@betrix/core';
import { env } from '@betrix/config';

/**
 * Redis-backed implementation of IMarketCacheStore.
 * Manages real-time price tick caching and D1 OHLC candle caching.
 */
export class RedisMarketCacheStore implements IMarketCacheStore {
  private static readonly PRICES_HASH_KEY = 'market:prices:all';
  private static readonly OHLC_KEY_PREFIX = 'market:ohlc:';

  constructor(private readonly redis: Redis) {}

  async cachePrice(tick: PriceTick): Promise<void> {
    const json = JSON.stringify({
      symbol: tick.symbol,
      bid: tick.bid,
      ask: tick.ask,
      spread: tick.spread,
      volume: tick.volume,
      timestamp: tick.timestamp
    });

    await this.redis.hset(RedisMarketCacheStore.PRICES_HASH_KEY, {
      [tick.symbol]: json
    });
  }

  async getPrice(symbol: string): Promise<Nullable<PriceTick>> {
    const raw = await this.redis.hget<string>(
      RedisMarketCacheStore.PRICES_HASH_KEY,
      symbol.toUpperCase()
    );
    if (!raw) return null;

    const parsed = typeof raw === 'string' ? safeJsonParse<any>(raw, null) : raw;
    if (!parsed) return null;

    return new PriceTick({
      symbol: parsed.symbol,
      bid: parsed.bid,
      ask: parsed.ask,
      spread: parsed.spread,
      volume: parsed.volume,
      timestamp: parsed.timestamp
    });
  }

  async getAllPrices(): Promise<PriceTick[]> {
    const all = await this.redis.hgetall<Record<string, string | object>>(
      RedisMarketCacheStore.PRICES_HASH_KEY
    );
    if (!all) return [];

    const ticks: PriceTick[] = [];
    for (const [sym, val] of Object.entries(all)) {
      const parsed = typeof val === 'string' ? safeJsonParse<any>(val, null) : val;
      if (parsed) {
        ticks.push(
          new PriceTick({
            symbol: sym,
            bid: parsed.bid,
            ask: parsed.ask,
            spread: parsed.spread,
            volume: parsed.volume,
            timestamp: parsed.timestamp
          })
        );
      }
    }

    return ticks;
  }

  async cacheOHLC(
    symbol: string,
    timeframe: string,
    bars: OHLCBar[],
    ttlSeconds?: number
  ): Promise<void> {
    const key = `${RedisMarketCacheStore.OHLC_KEY_PREFIX}${symbol.toUpperCase()}:${timeframe.toLowerCase()}`;
    // Cache D1 baseline dynamically aligned with broker midnight rollover (ADR-47)
    if (timeframe.toLowerCase() === 'd1') {
      const ttl =
        ttlSeconds && ttlSeconds > 0
          ? ttlSeconds
          : BrokerTimeCalculator.calculateTtlToNextBrokerRollover(env.BROKER_UTC_OFFSET);
      await this.redis.set(key, JSON.stringify(bars), { ex: ttl });
    }
  }

  async getOHLC(symbol: string, timeframe: string): Promise<Nullable<OHLCBar[]>> {
    const key = `${RedisMarketCacheStore.OHLC_KEY_PREFIX}${symbol.toUpperCase()}:${timeframe.toLowerCase()}`;
    const raw = await this.redis.get<string | OHLCBar[]>(key);
    if (!raw) return null;

    const parsed = typeof raw === 'string' ? safeJsonParse<any[]>(raw, []) : raw;
    return (parsed || []).map((b) => new OHLCBar(b));
  }
}
