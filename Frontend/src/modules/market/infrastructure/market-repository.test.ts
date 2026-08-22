import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarketMapper } from './mappers/MarketMapper';
import { HttpMarketRepository } from './repositories/HttpMarketRepository';
import { HttpClient } from '@shared/infrastructure/http/api-client';

describe('Market Infrastructure: MarketMapper & HttpMarketRepository', () => {
  let mockHttpClient: HttpClient;
  let marketRepo: HttpMarketRepository;

  beforeEach(() => {
    mockHttpClient = new HttpClient();
    marketRepo = new HttpMarketRepository(mockHttpClient);
  });

  it('should map instrument DTO and compute pip size correctly', () => {
    const rawDto = {
      symbol: 'EURUSD',
      name: 'Euro / US Dollar',
      category: 'forex',
      digits: 5,
      isActive: true
    };

    const domainSymbol = MarketMapper.toInstrumentEntity(rawDto);

    expect(domainSymbol.symbol).toBe('EURUSD');
    expect(domainSymbol.digits).toBe(5);
    expect(domainSymbol.pipSize).toBe(0.00001);
    expect(domainSymbol.isActive).toBe(true);
  });

  it('should fetch and map market prices snapshot via HttpMarketRepository', async () => {
    const mockPrices = [
      { s: 'BTCUSDT', bid: 60000, ask: 60010, c24p: 2.5, v: 1000 }
    ];

    vi.spyOn(mockHttpClient, 'get').mockResolvedValue({ data: mockPrices });

    const prices = await marketRepo.getPricesSnapshot();

    expect(prices).toHaveLength(1);
    expect(prices[0].symbol).toBe('BTCUSDT');
    expect(prices[0].last).toBe(60005);
    expect(prices[0].spread).toBe(10);
    expect(prices[0].change24hPercent).toBe(2.5);
  });
});
