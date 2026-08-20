import { and, arrayContains, desc, eq, sql } from 'drizzle-orm';
import { INewsRepository, NewsArticle, Nullable, PaginatedResult, PaginationParams } from '@betrix/domain';
import { DrizzleDb } from '../drizzle/client.js';
import { newsArticles } from '../drizzle/schema.js';

export class DrizzleNewsRepository implements INewsRepository {
  constructor(private readonly db: DrizzleDb) {}

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
    let saved = 0;
    for (const art of articles) {
      const res = await this.save(art);
      if (res) saved++;
    }
    return saved;
  }

  async findById(id: string): Promise<Nullable<NewsArticle>> {
    const result = await this.db.select().from(newsArticles).where(eq(newsArticles.id, id)).limit(1);
    return result[0] ? this.mapToDomain(result[0]) : null;
  }

  async findRecent(limit: number = 20, category?: string, tag?: string): Promise<NewsArticle[]> {
    const conditions = [];
    if (category) conditions.push(eq(newsArticles.category, category));
    if (tag) conditions.push(arrayContains(newsArticles.tags, [tag]));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch extra rows to ensure distinct headlines
    const rows = await this.db
      .select()
      .from(newsArticles)
      .where(whereClause)
      .orderBy(desc(newsArticles.datetime))
      .limit(limit * 5);

    const seenHeadlines = new Set<string>();
    const uniqueArticles: NewsArticle[] = [];

    for (const r of rows) {
      const normalizedHeadline = r.headline.trim().toLowerCase();
      if (!seenHeadlines.has(normalizedHeadline)) {
        seenHeadlines.add(normalizedHeadline);
        uniqueArticles.push(this.mapToDomain(r));
        if (uniqueArticles.length >= limit) break;
      }
    }

    return uniqueArticles;
  }

  async findAll(pagination: PaginationParams, category?: string, tag?: string): Promise<PaginatedResult<NewsArticle>> {
    const offset = (pagination.page - 1) * pagination.limit;
    const conditions = [];
    if (category) conditions.push(eq(newsArticles.category, category));
    if (tag) conditions.push(arrayContains(newsArticles.tags, [tag]));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
        .orderBy(desc(newsArticles.datetime))
    ]);

    const total = countResult[0]?.count || 0;
    return {
      data: rows.map((r) => this.mapToDomain(r)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit)
    };
  }
}
