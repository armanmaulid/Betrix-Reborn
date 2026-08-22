import { NewsArticle } from '../../domain/entities/NewsArticle';
import type { PaginatedResult } from '@shared/domain/types/Pagination';

export class NewsMapper {
  public static toDomain(dto: any): NewsArticle {
    return new NewsArticle({
      id: dto.id,
      source: dto.source || 'Finnhub',
      headline: dto.headline || '',
      url: dto.url || '#',
      summary: dto.summary || '',
      datetime: dto.datetime || Date.now(),
      category: dto.category || 'general',
      tags: dto.tags || [],
      image: dto.image,
      createdAt: dto.createdAt || new Date()
    });
  }

  public static toDomainPaginated(paginatedDto: any): PaginatedResult<NewsArticle> {
    const rawItems = Array.isArray(paginatedDto?.data) ? paginatedDto.data : [];
    const meta = paginatedDto?.meta || {
      page: 1,
      limit: rawItems.length,
      total: rawItems.length,
      totalPages: 1
    };

    return {
      data: rawItems.map(NewsMapper.toDomain),
      meta
    };
  }
}
