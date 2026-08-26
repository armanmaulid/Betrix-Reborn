import { pgTable, varchar, text, bigint, timestamp, index } from 'drizzle-orm/pg-core';

export const newsArticles = pgTable(
  'news_articles',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    source: varchar('source', { length: 255 }).notNull(),
    headline: text('headline').notNull(),
    url: text('url').notNull(),
    summary: text('summary').notNull(),
    datetime: bigint('datetime', { mode: 'number' }).notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    tags: text('tags').array(),
    image: text('image'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index('news_articles_datetime_idx').on(t.datetime),
    index('news_articles_category_datetime_idx').on(t.category, t.datetime),
    index('news_articles_tags_gin_idx').using('gin', t.tags)
  ]
);
