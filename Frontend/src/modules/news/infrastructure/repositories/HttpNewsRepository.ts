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

  async deleteNews(id: string): Promise<boolean> {
    await this.http.delete(`/api/admin/news/${encodeURIComponent(id)}`);
    return true;
  }

  async batchDeleteNews(ids: string[]): Promise<number> {
    const res = await this.http.post<{ data: { deletedCount: number } }>(
      '/api/admin/news/batch-delete',
      { ids }
    );
    return res.data?.deletedCount ?? ids.length;
  }
}

export const newsRepository = new HttpNewsRepository();
