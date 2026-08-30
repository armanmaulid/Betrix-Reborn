import { Value } from '@sinclair/typebox/value';
import { PaginatedResult } from '@betrix/core';
import { NewsArticle } from '@betrix/domain';
import { NewsService } from '../../services/NewsService.js';
import {
  GetNewsQueryDTO,
  GetNewsQuerySchema,
  ResolvedGetNewsQueryDTO
} from '../../schemas/news.schema.js';

export class GetNewsUseCase {
  constructor(private readonly newsService: NewsService) {}

  public async execute(query?: GetNewsQueryDTO): Promise<PaginatedResult<NewsArticle>> {
    // A1 — schema is the source of truth; Default fills `page: 1`, `limit: 20`.
    const input = Value.Default(GetNewsQuerySchema, query ?? {}) as ResolvedGetNewsQueryDTO;

    return this.newsService.getNewsPaginated(
      { page: input.page, limit: input.limit },
      input.category,
      input.tag,
      input.search,
      input.sort
    );
  }
}
