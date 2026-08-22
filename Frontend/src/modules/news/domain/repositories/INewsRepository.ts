import { NewsArticle } from '../entities/NewsArticle';
import type { PaginatedResult, PaginationQueryParams } from '@shared/domain/types/Pagination';

export interface NewsQueryParams extends PaginationQueryParams {
  category?: string;
  tag?: string;
}

export interface INewsRepository {
  getNews(params?: NewsQueryParams): Promise<PaginatedResult<NewsArticle>>;
}
