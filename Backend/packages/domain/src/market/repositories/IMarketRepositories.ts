import { Nullable } from '@betrix/core';
import { Symbol } from '../entities/Symbol.js';
import { OHLCBar, PriceTick } from '../entities/OHLCBar.js';

/** Repository for symbol catalog operations. */
export interface ISymbolRepository {
  findAll(activeOnly?: boolean): Promise<Symbol[]>;
  findByCategory(category: string): Promise<Symbol[]>;
  findBySymbol(symbol: string): Promise<Nullable<Symbol>>;
  save(symbol: Symbol): Promise<Symbol>;
  saveMany(symbols: Symbol[]): Promise<number>;
  delete(symbol: string): Promise<boolean>;
}

/**
 * Port for market data caching operations (Redis-backed).
 * Manages real-time price tick caching and OHLC candle caching.
 * Implementations live in the infrastructure layer.
 */
export interface IMarketCacheStore {
  /** Cache a real-time price tick in the in-memory relay store */
  cachePrice(tick: PriceTick): Promise<void>;
  /** Retrieve a cached price tick by symbol */
  getPrice(symbol: string): Promise<Nullable<PriceTick>>;
  /** Retrieve all cached price ticks */
  getAllPrices(): Promise<PriceTick[]>;
  /** Cache OHLC bars (typically D1 candles) with optional TTL */
  cacheOHLC(symbol: string, timeframe: string, bars: OHLCBar[], ttlSeconds?: number): Promise<void>;
  /** Retrieve cached OHLC bars by symbol and timeframe */
  getOHLC(symbol: string, timeframe: string): Promise<Nullable<OHLCBar[]>>;
}

/** @deprecated Use IMarketCacheStore instead */
export type IMarketDataRepository = IMarketCacheStore;
