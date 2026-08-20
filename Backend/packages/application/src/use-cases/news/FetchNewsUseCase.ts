import { NewsArticle } from '@betrix/domain';
import { NewsService } from '../../services/NewsService.js';
import { FetchNewsBodyDTO } from '../../schemas/news.schema.js';

export class FetchNewsUseCase {
  constructor(private readonly newsService: NewsService) {}

  public async execute(dto?: FetchNewsBodyDTO): Promise<NewsArticle[]> {
    const category = dto?.category || 'general';
    return this.newsService.fetchAndStoreNews(category);
  }
}
