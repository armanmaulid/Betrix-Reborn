import { NewsArticle } from '../entities/NewsArticle';
import type { PaginatedResult, PaginationQueryParams } from '@/shared/domain/types/Pagination';

export interface NewsQueryParams extends PaginationQueryParams {
  category?: string;
  tag?: string;
  sort?: 'asc' | 'desc';
}

export interface INewsRepository {
  getNews(params?: NewsQueryParams): Promise<PaginatedResult<NewsArticle>>;
  pollNews(category?: string): Promise<unknown>;
  deleteNews(id: string): Promise<boolean>;
  batchDeleteNews(ids: string[]): Promise<number>;
}
