import { PaginatedResult } from '@betrix/core';
import { NewsArticle } from '@betrix/domain';
import { NewsService } from '../../services/NewsService.js';
import { GetNewsQueryDTO } from '../../schemas/news.schema.js';

export class GetNewsUseCase {
  constructor(private readonly newsService: NewsService) {}

  public async execute(query?: GetNewsQueryDTO): Promise<PaginatedResult<NewsArticle>> {
    const page = query?.page || 1;
    const limit = query?.limit || 20;

    return this.newsService.getNewsPaginated(
      { page, limit },
      query?.category,
      query?.tag
    );
  }
}
