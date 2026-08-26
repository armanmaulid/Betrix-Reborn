import { PaginatedResult, PaginationParams, Nullable } from '@betrix/core';
import { NewsArticle } from '../entities/NewsArticle.js';

export interface INewsRepository {
  save(article: NewsArticle): Promise<NewsArticle | null>;
  saveMany(articles: NewsArticle[]): Promise<number>;
  findById(id: string): Promise<Nullable<NewsArticle>>;
  findRecent(limit?: number, category?: string, tag?: string): Promise<NewsArticle[]>;
  findAll(
    pagination: PaginationParams,
    category?: string,
    tag?: string,
    search?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<PaginatedResult<NewsArticle>>;
  deleteById(id: string): Promise<boolean>;
  deleteMany(ids: string[]): Promise<number>;
  /** T4.5 — purge news older than the cutoff (retention window). */
  deleteOlderThan(cutoff: Date): Promise<number>;
}

export interface INewsProvider {
  getProviderName(): string;
  getPollingIntervalMs(): number;
  fetchNews(category?: string): Promise<NewsArticle[]>;
}
