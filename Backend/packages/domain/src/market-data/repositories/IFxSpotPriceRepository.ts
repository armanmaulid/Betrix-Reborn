import { FxSpotPrice } from '../entities/FxSpotPrice.js';

export interface FxSpotPriceQuery {
  base?: string;
  quote?: string;
  /** Inclusive ISO date (YYYY-MM-DD) lower bound on `trade_date`. */
  fromDate?: string;
  /** Inclusive ISO date upper bound. */
  toDate?: string;
  limit?: number;
}

export interface IFxSpotPriceRepository {
  /** Bulk upsert (idempotent by id). Returns number of rows affected. */
  saveMany(prices: FxSpotPrice[]): Promise<number>;
  /** Upsert one bar (e.g. for an ongoing daily snapshot). */
  upsertOne(price: FxSpotPrice): Promise<FxSpotPrice>;
  /** Find by composite id. */
  findById(id: string): Promise<FxSpotPrice | null>;
  /** Query with flexible filters. Ordered by trade_date ascending. */
  findMany(query: FxSpotPriceQuery): Promise<FxSpotPrice[]>;
  /** Latest bar for a pair, or null if none stored. */
  findLatest(base: string, quote: string): Promise<FxSpotPrice | null>;
  /** Total rows for a pair (used by coverage verification). */
  countForPair(base: string, quote: string): Promise<number>;
}
