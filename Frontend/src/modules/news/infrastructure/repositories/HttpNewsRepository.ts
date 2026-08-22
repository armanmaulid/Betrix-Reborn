import type { INewsRepository, NewsQueryParams } from '../../domain/repositories/INewsRepository';
import { NewsArticle } from '../../domain/entities/NewsArticle';
import { NewsMapper } from '../mappers/NewsMapper';
import { HttpClient } from '@shared/infrastructure/http/api-client';
import type { PaginatedResult } from '@shared/domain/types/Pagination';

export class HttpNewsRepository implements INewsRepository {
  constructor(private http: HttpClient = new HttpClient()) {}

  async getNews(params?: NewsQueryParams): Promise<PaginatedResult<NewsArticle>> {
    const res = await this.http.get<{ data: any[]; meta: any }>('/api/news', {
      queryParams: params as Record<string, any>
    });
    return NewsMapper.toDomainPaginated(res);
  }
}

export const newsRepository = new HttpNewsRepository();
