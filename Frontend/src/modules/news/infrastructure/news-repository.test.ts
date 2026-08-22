import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NewsMapper } from './mappers/NewsMapper';
import { HttpNewsRepository } from './repositories/HttpNewsRepository';
import { HttpClient } from '@shared/infrastructure/http/api-client';

describe('News Infrastructure: NewsMapper & HttpNewsRepository', () => {
  let mockHttpClient: HttpClient;
  let newsRepo: HttpNewsRepository;

  beforeEach(() => {
    mockHttpClient = new HttpClient();
    newsRepo = new HttpNewsRepository(mockHttpClient);
  });

  it('should map news article DTO and clean tags correctly', () => {
    const rawDto = {
      id: 'news-1',
      source: 'Finnhub',
      headline: 'Fed holds interest rates steady',
      url: 'https://news.example.com/fed',
      summary: 'FOMC leaves benchmark rate unchanged.',
      category: 'forex',
      tags: ['#FED', '#FOMC', '#USD'],
      datetime: Date.now()
    };

    const article = NewsMapper.toDomain(rawDto);

    expect(article.id).toBe('news-1');
    expect(article.tags).toEqual(['fed', 'fomc', 'usd']);
    expect(article.matchesSymbol('USD')).toBe(true);
    expect(article.matchesSymbol('BTC')).toBe(false);
  });

  it('should fetch paginated news articles via HttpNewsRepository', async () => {
    vi.spyOn(mockHttpClient, 'get').mockResolvedValue({
      data: [{ id: 'n-1', headline: 'Gold Rallies', tags: ['#xauusd'] }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 }
    });

    const res = await newsRepo.getNews({ page: 1, limit: 10 });

    expect(res.data).toHaveLength(1);
    expect(res.data[0].headline).toBe('Gold Rallies');
  });
});
