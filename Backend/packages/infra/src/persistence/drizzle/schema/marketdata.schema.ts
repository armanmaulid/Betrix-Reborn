import {
  pgSchema,
  varchar,
  doublePrecision,
  bigint,
  date,
  timestamp,
  index,
  unique
} from 'drizzle-orm/pg-core';
import { content as contentSchema } from './schemas.js';

/**
 * Market-data tables populated from FXMacroData's Professional tier:
 *   • fx_spot_prices   — daily OHLC + technical indicators per pair
 *   • cot_positions    — CFTC Commitment of Traders per currency
 *   • commodity_prices — gold / silver / platinum history
 *
 * The same `content` schema namespace is reused (consistent with calendar_events
 * and news_articles) — these are *content* tables, not per-tenant data.
 */

// ── FX spot prices ────────────────────────────────────────────────────────
export const fxSpotPrices = contentSchema.table(
  'fx_spot_prices',
  {
    /** Composite id: {BASE}_{QUOTE}_{YYYY-MM-DD}. */
    id: varchar('id', { length: 64 }).primaryKey(),
    base: varchar('base', { length: 8 }).notNull(),
    quote: varchar('quote', { length: 8 }).notNull(),
    tradeDate: date('trade_date').notNull(),
    open: doublePrecision('open'),
    high: doublePrecision('high'),
    low: doublePrecision('low'),
    close: doublePrecision('close').notNull(),
    unit: varchar('unit', { length: 16 }),
    // Technical overlays — null when not requested or insufficient history.
    sma20: doublePrecision('sma_20'),
    sma50: doublePrecision('sma_50'),
    sma200: doublePrecision('sma_200'),
    rsi14: doublePrecision('rsi_14'),
    macd: doublePrecision('macd'),
    macdSignal: doublePrecision('macd_signal'),
    macdHist: doublePrecision('macd_hist'),
    ema12: doublePrecision('ema_12'),
    ema26: doublePrecision('ema_26'),
    bbUpper: doublePrecision('bb_upper'),
    bbMiddle: doublePrecision('bb_middle'),
    bbLower: doublePrecision('bb_lower'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index('fx_spot_prices_pair_date_idx').on(t.base, t.quote, t.tradeDate)]
);

// ── COT positioning ───────────────────────────────────────────────────────
export const cotPositions = contentSchema.table(
  'cot_positions',
  {
    /** Composite id: {CURRENCY}_{YYYY-MM-DD}. */
    id: varchar('id', { length: 32 }).primaryKey(),
    currency: varchar('currency', { length: 8 }).notNull(),
    tradeDate: date('trade_date').notNull(),
    commercialLong: bigint('commercial_long', { mode: 'number' }),
    commercialShort: bigint('commercial_short', { mode: 'number' }),
    commercialNet: bigint('commercial_net', { mode: 'number' }),
    noncommercialLong: bigint('noncommercial_long', { mode: 'number' }),
    noncommercialShort: bigint('noncommercial_short', { mode: 'number' }),
    noncommercialNet: bigint('noncommercial_net', { mode: 'number' }),
    totalOpenInterest: bigint('total_open_interest', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index('cot_positions_currency_date_idx').on(t.currency, t.tradeDate)]
);

// ── Commodities ──────────────────────────────────────────────────────────
export const commodityPrices = contentSchema.table(
  'commodity_prices',
  {
    /** Composite id: {INDICATOR}_{YYYY-MM-DD}, e.g. gold_2025-08-26. */
    id: varchar('id', { length: 64 }).primaryKey(),
    indicator: varchar('indicator', { length: 16 }).notNull(),
    tradeDate: date('trade_date').notNull(),
    close: doublePrecision('close').notNull(),
    open: doublePrecision('open'),
    high: doublePrecision('high'),
    low: doublePrecision('low'),
    unit: varchar('unit', { length: 16 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index('commodity_prices_indicator_date_idx').on(t.indicator, t.tradeDate)]
);

// Suppress unused warning for the `unique` re-export shape consistency with
// other schema files (kept available for future use without re-importing).
void unique;
void pgSchema;
