import { PaginatedResult, PaginationParams, Nullable } from '@betrix/core';
import { INewsRepository, INewsProvider, NewsArticle, NewsTagging } from '@betrix/domain';

export class NewsService {
  constructor(
    private readonly newsRepo: INewsRepository,
    private readonly newsProvider: INewsProvider
  ) {}

  public async fetchAndStoreNews(category: string = 'general'): Promise<NewsArticle[]> {
    const rawArticles = await this.newsProvider.fetchNews(category);
    if (!rawArticles || rawArticles.length === 0) return [];

    const taggedArticles = rawArticles.map((art) => {
      const tags = NewsTagging.extractTags(`${art.headline} ${art.summary}`);
      return new NewsArticle({
        id: art.id,
        source: art.source,
        headline: art.headline,
        url: art.url,
        summary: art.summary,
        datetime: art.datetime,
        category: art.category || category,
        tags,
        image: art.image,
        createdAt: art.createdAt || new Date()
      });
    });

    await this.newsRepo.saveMany(taggedArticles);

    return taggedArticles;
  }

  public async getRecentNews(
    limit: number = 20,
    category?: string,
    tag?: string
  ): Promise<NewsArticle[]> {
    return this.newsRepo.findRecent(limit, category, tag);
  }

  public async getNewsPaginated(
    pagination: PaginationParams,
    category?: string,
    tag?: string,
    search?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<PaginatedResult<NewsArticle>> {
    return this.newsRepo.findAll(pagination, category, tag, search, sortOrder);
  }

  public async getNewsById(id: string): Promise<Nullable<NewsArticle>> {
    return this.newsRepo.findById(id);
  }

  public async deleteNews(id: string): Promise<boolean> {
    return this.newsRepo.deleteById(id);
  }

  public async batchDeleteNews(ids: string[]): Promise<number> {
    return this.newsRepo.deleteMany(ids);
  }
}
