import { and, arrayContains, asc, desc, eq, gt, ilike, inArray, lt, or, sql } from 'drizzle-orm';
import { getTableColumns } from 'drizzle-orm/utils';
import {
  INewsRepository,
  NewsArticle,
  Nullable,
  PaginatedResult,
  PaginationParams
} from '@betrix/domain';
import { DrizzleDb } from '../drizzle/client.js';
import { newsArticles } from '../drizzle/schema.js';
import { redisKeys } from '../redis/redis-keys.js';

/** Minimal structural Redis client (Upstash-compatible) for cache offloads. */
interface KvLike {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
}

export class DrizzleNewsRepository implements INewsRepository {
  constructor(
    private readonly db: DrizzleDb,
    private readonly redis?: KvLike
  ) {}

  /** T3.2 — news list writes invalidate the shared page-1 cache. */
  private invalidatePageCache(): void {
    void this.redis?.del(redisKeys.cacheNewsPage1()).catch(() => undefined);
  }

  private mapToDomain(row: typeof newsArticles.$inferSelect): NewsArticle {
    return new NewsArticle({
      id: row.id,
      source: row.source,
      headline: row.headline,
      url: row.url,
      summary: row.summary,
      datetime: row.datetime,
      category: row.category,
      tags: row.tags ?? [],
      image: row.image,
      createdAt: row.createdAt
    });
  }

  async save(article: NewsArticle): Promise<NewsArticle | null> {
    this.invalidatePageCache();
    const inserted = await this.db
      .insert(newsArticles)
      .values({
        id: article.id,
        source: article.source,
        headline: article.headline,
        url: article.url,
        summary: article.summary,
        datetime: article.datetime,
        category: article.category,
        tags: article.tags,
        image: article.image,
        createdAt: article.createdAt
      })
      .onConflictDoNothing()
      .returning();

    return inserted[0] ? this.mapToDomain(inserted[0]) : null;
  }

  async saveMany(articles: NewsArticle[]): Promise<number> {
    if (articles.length === 0) return 0;
    this.invalidatePageCache();
    const inserted = await this.db
      .insert(newsArticles)
      .values(
        articles.map((article) => ({
          id: article.id,
          source: article.source,
          headline: article.headline,
          url: article.url,
          summary: article.summary,
          datetime: article.datetime,
          category: article.category,
          tags: article.tags,
          image: article.image,
          createdAt: article.createdAt
        }))
      )
      .onConflictDoNothing()
      .returning({ id: newsArticles.id });
    return inserted.length;
  }

  async findById(id: string): Promise<Nullable<NewsArticle>> {
    const result = await this.db
      .select()
      .from(newsArticles)
      .where(eq(newsArticles.id, id))
      .limit(1);
    return result[0] ? this.mapToDomain(result[0]) : null;
  }

  async findRecent(limit: number = 20, category?: string, tag?: string): Promise<NewsArticle[]> {
    const conditions = [];
    if (category) conditions.push(eq(newsArticles.category, category));
    if (tag) {
      const cleanTag = tag.replace(/^#/, '').trim().toLowerCase();
      if (cleanTag) conditions.push(arrayContains(newsArticles.tags, [cleanTag]));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // D-4 — `DISTINCT ON (headline)` returns the first row per headline in
    // ORDER BY order. Single round-trip, no JS-side over-fetch. Postgres
    // applies LIMIT after dedup so the result is always <= limit.
    // Note: dedup keys the raw `headline` text (matches `findAll` parity);
    // the prior JS loop normalized case/whitespace which is no longer
    // needed here because the SQL returns one row per distinct headline.
    const rows = await this.db
      .selectDistinctOn([newsArticles.headline], getTableColumns(newsArticles))
      .from(newsArticles)
      .where(whereClause)
      .orderBy(newsArticles.headline, desc(newsArticles.datetime))
      .limit(limit);

    return rows.map((r) => this.mapToDomain(r));
  }

  async findSince(since: number, limit: number = 25, category?: string): Promise<NewsArticle[]> {
    // P16 — SSE news-relay watermark. Returns articles with `datetime > since`
    // (Unix seconds), ordered ascending so the relay can stream them in
    // publication order. Caller advances the watermark to the latest returned.
    const conditions = [gt(newsArticles.datetime, since)];
    if (category) conditions.push(eq(newsArticles.category, category));
    const rows = await this.db
      .select()
      .from(newsArticles)
      .where(and(...conditions))
      .orderBy(asc(newsArticles.datetime))
      .limit(limit);
    return rows.map((r) => this.mapToDomain(r));
  }

  async findAll(
    pagination: PaginationParams,
    category?: string,
    tag?: string,
    search?: string,
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<PaginatedResult<NewsArticle>> {
    // T3.2 — read-through for the unfiltered first page (30s): hottest read.
    const canReadCache =
      !!this.redis && pagination.page === 1 && !category && !tag && !search && sortOrder === 'desc';
    if (canReadCache) {
      try {
        const raw = await this.redis!.get<PaginatedResult<NewsArticle>>(redisKeys.cacheNewsPage1());
        if (raw) return raw;
      } catch {
        // Cache read failure falls through to the DB query.
      }
    }

    const offset = (pagination.page - 1) * pagination.limit;
    const conditions = [];
    if (category) conditions.push(eq(newsArticles.category, category));
    if (tag) {
      const cleanTag = tag.replace(/^#/, '').trim().toLowerCase();
      if (cleanTag) conditions.push(arrayContains(newsArticles.tags, [cleanTag]));
    }
    if (search) {
      const cleanSearch = search.replace(/^#/, '').trim();
      const q = `%${cleanSearch}%`;
      conditions.push(or(ilike(newsArticles.headline, q), ilike(newsArticles.summary, q)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const orderClause =
      sortOrder === 'asc' ? asc(newsArticles.datetime) : desc(newsArticles.datetime);

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(newsArticles)
        .where(whereClause),
      this.db
        .select()
        .from(newsArticles)
        .where(whereClause)
        .limit(pagination.limit)
        .offset(offset)
        .orderBy(orderClause)
    ]);

    const total = countResult[0]?.count || 0;
    const result = {
      data: rows.map((r) => this.mapToDomain(r)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit)
    };

    // T3.2 — cache only the unfiltered first page (30s) — the hottest read.
    const canCache =
      this.redis && pagination.page === 1 && !category && !tag && !search && sortOrder === 'desc';
    if (canCache) {
      try {
        await this.redis.set(redisKeys.cacheNewsPage1(), result, { ex: 30 });
      } catch {
        // Cache write failure is non-fatal.
      }
    }

    return result;
  }

  async deleteById(id: string): Promise<boolean> {
    this.invalidatePageCache();
    const result = await this.db
      .delete(newsArticles)
      .where(eq(newsArticles.id, id))
      .returning({ id: newsArticles.id });
    return result.length > 0;
  }

  async deleteMany(ids: string[]): Promise<number> {
    this.invalidatePageCache();
    if (!ids || ids.length === 0) return 0;
    const result = await this.db
      .delete(newsArticles)
      .where(inArray(newsArticles.id, ids))
      .returning({ id: newsArticles.id });
    return result.length;
  }

  /** T4.5 — retention: purge news older than the cutoff. */
  async deleteOlderThan(cutoff: Date): Promise<number> {
    this.invalidatePageCache();
    const deleted = await this.db
      .delete(newsArticles)
      .where(lt(newsArticles.createdAt, cutoff))
      .returning({ id: newsArticles.id });
    return deleted.length;
  }
}
