import type { INewsRepository, NewsQueryParams } from '../../domain/repositories/INewsRepository';
import { NewsArticle } from '../../domain/entities/NewsArticle';
import { NewsMapper } from '../mappers/NewsMapper';
import { HttpClient } from '@/shared/infrastructure/http/api-client';
import type { PaginatedResult, PaginationMeta } from '@/shared/domain/types/Pagination';

export class HttpNewsRepository implements INewsRepository {
  constructor(private http: HttpClient = new HttpClient()) {}

  async getNews(params?: NewsQueryParams): Promise<PaginatedResult<NewsArticle>> {
    const res = await this.http.get<{ data: unknown[]; meta: PaginationMeta }>('/api/news', {
      queryParams: params as Record<string, string | number | boolean | undefined>
    });
    return NewsMapper.toDomainPaginated(res);
  }

  async pollNews(category: string = 'general'): Promise<unknown> {
    return this.http.post('/api/admin/news/poll', { category });
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
