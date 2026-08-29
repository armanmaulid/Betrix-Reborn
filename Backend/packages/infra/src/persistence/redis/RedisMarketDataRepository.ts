import { Redis } from '@upstash/redis';
import {
  IMarketCacheStore,
  OHLCBar,
  PriceTick,
  Nullable,
  BrokerTimeCalculator
} from '@betrix/domain';
import { env } from '@betrix/config';
import { redisKeys } from './redis-keys.js';

/**
 * Redis-backed implementation of IMarketCacheStore.
 * Manages real-time price tick caching and D1 OHLC candle caching.
 *
 * T2.4 — staleness guard: a tick older than PRICE_STALE_MS is treated as
 * absent so a dead ws-worker can never serve frozen prices forever. The hash
 * itself has no field-level TTL (Upstash limitation), so cleanup-worker also
 * prunes fields for symbols that left the active universe.
 */
export class RedisMarketCacheStore implements IMarketCacheStore {
  private static readonly STALE_MS = env.PRICE_STALE_MS;

  constructor(private readonly redis: Redis) {}

  private static toTick(symbol: string, parsed: any): PriceTick | null {
    if (!parsed || typeof parsed !== 'object') return null;
    return new PriceTick({
      symbol: parsed.symbol ?? symbol,
      bid: parsed.bid,
      ask: parsed.ask,
      spread: parsed.spread,
      volume: parsed.volume,
      timestamp: parsed.timestamp
    });
  }

  private static isFresh(tick: PriceTick): boolean {
    return Date.now() - tick.timestamp <= RedisMarketCacheStore.STALE_MS;
  }

  async cachePrice(tick: PriceTick): Promise<void> {
    await this.redis.hset(redisKeys.marketPricesAll(), {
      [tick.symbol]: {
        symbol: tick.symbol,
        bid: tick.bid,
        ask: tick.ask,
        spread: tick.spread,
        volume: tick.volume,
        timestamp: tick.timestamp
      }
    });
  }

  async getPrice(symbol: string): Promise<Nullable<PriceTick>> {
    const raw = await this.redis.hget<any>(redisKeys.marketPricesAll(), symbol.toUpperCase());
    if (!raw) return null;

    const tick = RedisMarketCacheStore.toTick(symbol.toUpperCase(), raw);
    if (!tick) return null;

    return RedisMarketCacheStore.isFresh(tick) ? tick : null;
  }

  async getAllPrices(): Promise<PriceTick[]> {
    const all = await this.redis.hgetall<Record<string, any>>(redisKeys.marketPricesAll());
    if (!all) return [];

    const ticks: PriceTick[] = [];
    for (const [sym, val] of Object.entries(all)) {
      const tick = RedisMarketCacheStore.toTick(sym, val);
      if (tick && RedisMarketCacheStore.isFresh(tick)) ticks.push(tick);
    }

    return ticks;
  }

  /** T2.4 — HDEL every field whose symbol is no longer in `activeSymbols`. */
  async prunePrices(activeSymbols: string[]): Promise<number> {
    const all = await this.redis.hgetall<Record<string, unknown>>(redisKeys.marketPricesAll());
    if (!all) return 0;

    const keep = new Set(activeSymbols.map((s) => s.toUpperCase()));
    let removed = 0;
    for (const field of Object.keys(all)) {
      if (!keep.has(field)) {
        await this.redis.hdel(redisKeys.marketPricesAll(), field);
        removed += 1;
      }
    }
    return removed;
  }

  async cacheOHLC(
    symbol: string,
    timeframe: string,
    bars: OHLCBar[],
    ttlSeconds?: number
  ): Promise<void> {
    const key = redisKeys.marketOhlc(symbol, timeframe);
    // Cache D1 baseline dynamically aligned with broker midnight rollover (ADR-47)
    if (timeframe.toLowerCase() === 'd1') {
      const ttl =
        ttlSeconds && ttlSeconds > 0
          ? ttlSeconds
          : BrokerTimeCalculator.calculateTtlToNextBrokerRollover(env.BROKER_UTC_OFFSET);
      await this.redis.set(key, bars, { ex: ttl });
    }
  }

  async getOHLC(symbol: string, timeframe: string): Promise<Nullable<OHLCBar[]>> {
    const key = redisKeys.marketOhlc(symbol, timeframe);
    const raw = await this.redis.get<OHLCBar[]>(key);
    if (!raw) return null;

    return (raw || []).map((b) => new OHLCBar(b));
  }
}
