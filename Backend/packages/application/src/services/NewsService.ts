import { PaginatedResult, PaginationParams, Nullable } from '@betrix/core';
import {
  INewsRepository,
  INewsProvider,
  INotifier,
  NewsArticle,
  NewsTagging
} from '@betrix/domain';

export class NewsService {
  constructor(
    private readonly newsRepo: INewsRepository,
    private readonly newsProvider: INewsProvider,
    private readonly notifier?: INotifier
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

    // Broadcast new articles via SSE notifier if provided
    if (this.notifier) {
      for (const article of taggedArticles) {
        this.notifier.broadcastGlobal('news', 'news:item', article.toJSON());
      }
    }

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
    tag?: string
  ): Promise<PaginatedResult<NewsArticle>> {
    return this.newsRepo.findAll(pagination, category, tag);
  }

  public async getNewsById(id: string): Promise<Nullable<NewsArticle>> {
    return this.newsRepo.findById(id);
  }
}
