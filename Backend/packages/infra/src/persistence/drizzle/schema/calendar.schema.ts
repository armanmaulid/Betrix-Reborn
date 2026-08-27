import {
  pgSchema,
  pgTable,
  varchar,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  index,
  unique
} from 'drizzle-orm/pg-core';
import { content as contentSchema } from './schemas.js';

/**
 * Economic calendar events sourced from FXMacroData (see FxMacroDataClient).
 * `id` mirrors FXMacroData's own `announcement_id` format
 * (`{currency}_{event_code}_{reference_period_date}`) so upserts triggered by
 * the SSE stream (`/v1/stream/events`) map directly onto existing rows without
 * a separate lookup table.
 */
export const calendarEvents = contentSchema.table(
  'calendar_events',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    currency: varchar('currency', { length: 10 }).notNull(),
    eventCode: varchar('event_code', { length: 150 }).notNull(),
    eventName: varchar('event_name', { length: 255 }).notNull(),
    referencePeriodDate: varchar('reference_period_date', { length: 20 }),
    announcementUnix: integer('announcement_unix').notNull(),
    announcementDatetimeUtc: varchar('announcement_datetime_utc', { length: 40 }).notNull(),
    announcementDatetimeLocal: varchar('announcement_datetime_local', { length: 40 }).notNull(),
    importance: varchar('importance', { length: 10 }).notNull(),
    marketTier: integer('market_tier').notNull(),
    isTopTier: boolean('is_top_tier').notNull().default(false),
    sourceName: varchar('source_name', { length: 255 }),
    sourceUrl: text('source_url'),
    beforeValue: doublePrecision('before_value'),
    forecastValue: doublePrecision('forecast_value'),
    forecastType: varchar('forecast_type', { length: 30 }),
    actualValue: doublePrecision('actual_value'),
    hasOfficialForecast: boolean('has_official_forecast').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index('calendar_events_currency_unix_idx').on(t.currency, t.announcementUnix),
    unique('calendar_events_currency_code_unix_unique').on(
      t.currency,
      t.eventCode,
      t.announcementUnix
    )
  ]
);
