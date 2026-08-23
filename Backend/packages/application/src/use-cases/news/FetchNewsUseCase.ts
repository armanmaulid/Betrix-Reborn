import { NewsArticle, IAdminActionRepository, AdminAction } from '@betrix/domain';
import { NewsService } from '../../services/NewsService.js';
import { FetchNewsBodyDTO } from '../../schemas/news.schema.js';

export class FetchNewsUseCase {
  constructor(
    private readonly newsService: NewsService,
    private readonly adminActionRepo?: IAdminActionRepository
  ) {}

  public async execute(
    dto?: FetchNewsBodyDTO,
    context?: { adminId?: string; ip?: string; userAgent?: string }
  ): Promise<NewsArticle[]> {
    const category = dto?.category || 'general';
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
