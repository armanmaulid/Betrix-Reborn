import { Value } from '@sinclair/typebox/value';
import { NewsArticle, IAdminActionRepository, AdminAction } from '@betrix/domain';
import { NewsService } from '../../services/NewsService.js';
import { FetchNewsBodyDTO, FetchNewsBodySchema } from '../../schemas/news.schema.js';

export class FetchNewsUseCase {
  constructor(
    private readonly newsService: NewsService,
    private readonly adminActionRepo?: IAdminActionRepository
  ) {}

  public async execute(
    dto?: FetchNewsBodyDTO,
    context?: { adminId?: string; ip?: string; userAgent?: string }
  ): Promise<NewsArticle[]> {
    // A1 — schema is the source of truth; Default fills `category: 'general'`.
    const input = Value.Default(FetchNewsBodySchema, dto ?? {}) as FetchNewsBodyDTO;
    const category = input.category;
    const articles = await this.newsService.fetchAndStoreNews(category);

    if (articles.length > 0 && this.adminActionRepo && context?.adminId) {
      await this.adminActionRepo.save(
        new AdminAction({
          id: crypto.randomUUID(),
          adminId: context.adminId,
          action: 'POLL_NEWS',
          targetType: 'news_article',
          targetId: `poll_${category}`,
          details: { category, polledCount: articles.length },
          ip: context?.ip,
          userAgent: context?.userAgent,
          createdAt: new Date()
        })
      );
    }

    return articles;
  }
}
