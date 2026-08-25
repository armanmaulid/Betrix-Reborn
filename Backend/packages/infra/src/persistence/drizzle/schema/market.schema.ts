import { pgTable, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const symbols = pgTable('symbols', {
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

export const streamSymbols = pgTable('stream_symbols', {
  symbol: varchar('symbol', { length: 50 }).primaryKey(),
  finnhubSymbol: varchar('finnhub_symbol', { length: 100 }).notNull().unique(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const ohlcSymbols = pgTable('ohlc_symbols', {
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
