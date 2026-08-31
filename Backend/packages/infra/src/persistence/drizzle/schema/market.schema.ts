import { varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { trading as tradingSchema } from './schemas.js';

export const symbols = tradingSchema.table('symbols', {
  symbol: varchar('symbol', { length: 50 }).primaryKey(),
  description: text('description'),
  path: varchar('path', { length: 255 }),
  category: varchar('category', { length: 100 }).notNull(),
  finnhubSymbol: varchar('finnhub_symbol', { length: 100 }),
  dukascopySymbol: varchar('dukascopy_symbol', { length: 100 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const streamSymbols = tradingSchema.table('stream_symbols', {
  symbol: varchar('symbol', { length: 50 }).primaryKey(),
  finnhubSymbol: varchar('finnhub_symbol', { length: 100 }).notNull().unique(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const ohlcSymbols = tradingSchema.table('ohlc_symbols', {
  symbol: varchar('symbol', { length: 50 })
    .primaryKey()
    .references(() => symbols.symbol, { onDelete: 'cascade' }),
  dukascopySymbol: varchar('dukascopy_symbol', { length: 100 }).notNull().unique(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});
