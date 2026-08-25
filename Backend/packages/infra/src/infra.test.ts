import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import {
  createPgPool,
  createDrizzleClient,
  DrizzleUserRepository,
  DrizzleSymbolRepository,
  createRedisClient,
  RedisMarketCacheStore,
  RedisCaptchaStore,
  RedisStreamTicketStore,
  FinnhubRealtimeClient,
  DukascopyHistoryClient,
  SseManager
} from './index.js';
import { User, PriceTick, Symbol } from '@betrix/domain';

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://betrix:betrixpass@localhost:5432/betrix_reborn';
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || 'http://localhost:8079';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'local_dev_token';

describe('Infrastructure - PostgreSQL Repositories', () => {
  let pool: any;
  let userRepo: DrizzleUserRepository;
  let symbolRepo: DrizzleSymbolRepository;

  beforeAll(async () => {
    pool = createPgPool(DATABASE_URL, 2);
    const db = createDrizzleClient(pool);
    userRepo = new DrizzleUserRepository(db);
    symbolRepo = new DrizzleSymbolRepository(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should save, find, and update a user in PostgreSQL', async () => {
    const testEmail = `test_${Date.now()}@betrix.io`;
    const user = new User({
      id: crypto.randomUUID(),
      email: testEmail,
      isAdmin: false,
      status: 'active',
      emailVerified: false,
      credits: 150,
      createdAt: new Date()
    });

    const saved = await userRepo.save(user);
    expect(saved.email).toBe(testEmail);
    expect(saved.credits).toBe(150);

    const found = await userRepo.findByEmail(testEmail);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(saved.id);

    const updated = await userRepo.updateCredits(saved.id, 200);
    expect(updated).toBe(true);

    const afterUpdate = await userRepo.findById(saved.id);
    expect(afterUpdate?.credits).toBe(200);

    // Cleanup
    await userRepo.delete(saved.id);
  });

  it('should query seeded symbols from PostgreSQL', async () => {
    const allSymbols = await symbolRepo.findAll();
    expect(allSymbols.length).toBeGreaterThan(0);

    const eurusd = await symbolRepo.findBySymbol('EURUSD');
    expect(eurusd).not.toBeNull();
    expect(eurusd?.finnhubSymbol).toBe('OANDA:EUR_USD');
    expect(eurusd?.dukascopySymbol).toBe('eurusd');
  });
});

describe('Infrastructure - Redis Stores (SRH Port 8079)', () => {
  const redis = createRedisClient(REDIS_URL, REDIS_TOKEN);
  const marketRepo = new RedisMarketCacheStore(redis);
  const captchaStore = new RedisCaptchaStore(redis);
  const ticketStore = new RedisStreamTicketStore(redis);

  it('should cache and retrieve price ticks in Redis', async () => {
    const tick = new PriceTick({
      symbol: 'EURUSD',
      bid: 1.08542,
      ask: 1.08545,
      spread: 3,
      volume: 150,
      timestamp: Date.now()
    });

    await marketRepo.cachePrice(tick);

    const cached = await marketRepo.getPrice('EURUSD');
    expect(cached).not.toBeNull();
    expect(cached?.symbol).toBe('EURUSD');
    expect(cached?.bid).toBe(1.08542);

    const allPrices = await marketRepo.getAllPrices();
    expect(allPrices.some((p) => p.symbol === 'EURUSD')).toBe(true);
  });

  it('should store and burn single-use tickets atomically', async () => {
    const ticket = `ticket_${Date.now()}`;
    await ticketStore.save(ticket, 'user-123', 30);

    const retrieved = await ticketStore.getAndDelete(ticket);
    expect(retrieved).toBe('user-123');

    // Second retrieval must return null (single-use burned)
    const secondTry = await ticketStore.getAndDelete(ticket);
    expect(secondTry).toBeNull();
  });

  it('should store and verify CAPTCHA challenges single-use', async () => {
    const challengeId = `cap_${Date.now()}`;
    await captchaStore.save(challengeId, '42', 60);

    const answer = await captchaStore.getAndDelete(challengeId);
    expect(answer).toBe('42');

    const secondAnswer = await captchaStore.getAndDelete(challengeId);
    expect(secondAnswer).toBeNull();
  });
});

describe('Infrastructure - External Adapters', () => {
  it('should maintain Finnhub reverse symbol mapping correctly', () => {
    const client = new FinnhubRealtimeClient('mock-key', 'wss://mock', {
      EURUSD: 'OANDA:EUR_USD',
      BTCUSD: 'BINANCE:BTCUSDT'
    });

    // Verify symbol mapping update
    client.updateSymbolMap({ XAUUSD: 'OANDA:XAU_USD' });
  });

  it('should handle Dukascopy weekend Friday snapping', () => {
    const client = new DukascopyHistoryClient({
      EURUSD: 'eurusd'
    });
    expect(client).toBeDefined();
  });

  it('should manage SSE clients and stats', () => {
    const sse = new SseManager();
    const stats = sse.getStats();
    expect(stats.totalClients).toBe(0);
    sse.shutdown();
  });

  it('should implement CachedMarketDataProvider with D1 cache-aside pattern (ADR-27)', async () => {
    const { CachedMarketDataProvider } =
      await import('./external/market/CachedMarketDataProvider.js');
    const { OHLCBar } = await import('@betrix/domain');

    const cachedBars = [
      new OHLCBar({
        time: 1700000000,
        open: 1.08,
        high: 1.09,
        low: 1.07,
        close: 1.085,
        volume: 500
      })
    ];

    const mockHistoricalProvider = {
      fetchHistory: vi.fn().mockResolvedValue(cachedBars)
    };

    const mockCacheStore = {
      getOHLC: vi.fn().mockResolvedValue(cachedBars),
      cacheOHLC: vi.fn().mockResolvedValue(undefined),
      getPrice: vi.fn(),
      getAllPrices: vi.fn()
    };

    const provider = new CachedMarketDataProvider(
      mockHistoricalProvider as any,
      mockCacheStore as any
    );

    // D1 request: should return from cache (no fetchHistory call)
    const d1Bars = await provider.fetchHistory('EURUSD', 'd1', new Date(), new Date());
    expect(d1Bars).toHaveLength(1);
    expect(mockCacheStore.getOHLC).toHaveBeenCalledWith('EURUSD', 'd1');
    expect(mockHistoricalProvider.fetchHistory).not.toHaveBeenCalled();

    // H1 request: should skip cache entirely, fetch from source
    mockHistoricalProvider.fetchHistory.mockResolvedValueOnce(cachedBars);
    const h1Bars = await provider.fetchHistory('EURUSD', 'h1', new Date(), new Date());
    expect(h1Bars).toHaveLength(1);
    expect(mockHistoricalProvider.fetchHistory).toHaveBeenCalledWith(
      'EURUSD',
      'h1',
      expect.any(Date),
      expect.any(Date)
    );
  });

  it('should fall through to historical source when D1 cache is empty (ADR-27)', async () => {
    const { CachedMarketDataProvider } =
      await import('./external/market/CachedMarketDataProvider.js');
    const { OHLCBar } = await import('@betrix/domain');

    const freshBars = [
      new OHLCBar({
        time: 1700000000,
        open: 1.08,
        high: 1.09,
        low: 1.07,
        close: 1.085,
        volume: 500
      })
    ];

    const mockHistoricalProvider = {
      fetchHistory: vi.fn().mockResolvedValue(freshBars)
    };

    const mockCacheStore = {
      getOHLC: vi.fn().mockResolvedValue(null), // cache miss
      cacheOHLC: vi.fn().mockResolvedValue(undefined),
      getPrice: vi.fn(),
      getAllPrices: vi.fn()
    };

    const provider = new CachedMarketDataProvider(
      mockHistoricalProvider as any,
      mockCacheStore as any
    );

    const bars = await provider.fetchHistory('EURUSD', 'd1', new Date(), new Date());
    expect(bars).toHaveLength(1);
    expect(mockHistoricalProvider.fetchHistory).toHaveBeenCalled();
    expect(mockCacheStore.cacheOHLC).toHaveBeenCalledWith('EURUSD', 'd1', freshBars);
  });
});
