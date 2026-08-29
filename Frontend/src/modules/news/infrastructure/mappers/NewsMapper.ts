import { NewsArticle, type NewsArticleProps } from '../../domain/entities/NewsArticle';
import { toDomainPaginated } from '@/shared/domain/types/Pagination';
import type { PaginationMeta } from '@/shared/domain/types/Pagination';

export class NewsMapper {
  public static toDomain(dto: unknown): NewsArticle {
    const d = dto as NewsArticleProps;
    return new NewsArticle({
      id: d.id,
      source: d.source || 'Finnhub',
      headline: d.headline || '',
      url: d.url || '#',
      summary: d.summary || '',
      datetime: d.datetime,
      category: d.category || 'general',
      tags: d.tags || [],
      image: d.image,
      createdAt: d.createdAt || new Date()
    });
  }

  public static toDomainPaginated(
    paginatedDto: { data?: unknown[]; meta?: PaginationMeta } | unknown[]
  ) {
    return toDomainPaginated(paginatedDto, NewsMapper.toDomain);
  }
}
