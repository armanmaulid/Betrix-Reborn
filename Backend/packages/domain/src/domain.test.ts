import { describe, it, expect, vi } from 'vitest';
import {
  User,
  Session,
  Email,
  Password,
  DeviceFingerprint,
  LoginPolicy,
  DeviceDomainService,
  ThinkingFilter,
  IndicatorCalculator,
  ModelPolicy,
  NewsTagging,
  EventDispatcher,
  ValidationError,
  ConflictError,
  OHLCBar,
  PriceTick,
  Symbol,
  AiAgent,
  CreditVoucher,
  CreditTransaction,
  NewsArticle,
  ChatMessage,
  Device,
  Message,
  MarketTimeCalculator,
  BackgroundWorker
} from './index.js';

describe('Domain - Identity & Access', () => {
  it('should validate Email value object correctly', () => {
    const email = new Email('trader@betrix.io');
    expect(email.value).toBe('trader@betrix.io');
    expect(() => new Email('invalid-email')).toThrow(ValidationError);
  });

  it('should validate Password value object length', () => {
    const pw = new Password('StrongPass123!');
    expect(pw.plaintext).toBe('StrongPass123!');
    expect(() => new Password('short')).toThrow(ValidationError);
  });

  it('should enforce strict 1:1 device binding rules via DeviceDomainService', () => {
    const fp = new DeviceFingerprint('hash123');
    // Available device
    expect(DeviceDomainService.validateBinding('user-1', null, fp).canBind).toBe(true);

    // Existing device owned by same user
    const ownedDevice = { id: 'd1', userId: 'user-1', fingerprint: 'hash123', lastSeenAt: new Date(), createdAt: new Date() };
    expect(DeviceDomainService.validateBinding('user-1', ownedDevice as any, fp).canBind).toBe(true);

    // Conflict: Existing device owned by different user
    const foreignDevice = { id: 'd2', userId: 'user-2', fingerprint: 'hash123', lastSeenAt: new Date(), createdAt: new Date() };
    expect(() => DeviceDomainService.validateBinding('user-1', foreignDevice as any, fp)).toThrow(ConflictError);
  });

  it('should calculate login policy delays and CAPTCHA thresholds', () => {
    // 0 to 4 failures: No CAPTCHA, 0s delay
    expect(LoginPolicy.evaluate(0)).toEqual({ delaySeconds: 0, isCaptchaRequired: false });
    expect(LoginPolicy.evaluate(4)).toEqual({ delaySeconds: 0, isCaptchaRequired: false });

    // 5 failures: CAPTCHA required, 0s delay
    expect(LoginPolicy.evaluate(5)).toEqual({ delaySeconds: 0, isCaptchaRequired: true });

    // 6 failures: CAPTCHA + 1s delay
    expect(LoginPolicy.evaluate(6)).toEqual({ delaySeconds: 1, isCaptchaRequired: true });

    // 7 failures: CAPTCHA + 2s delay
    expect(LoginPolicy.evaluate(7)).toEqual({ delaySeconds: 2, isCaptchaRequired: true });

    // 12 failures: CAPTCHA + capped at 30s delay
    expect(LoginPolicy.evaluate(12)).toEqual({ delaySeconds: 30, isCaptchaRequired: true });
  });

  it('should deduct credits immutably on User entity', () => {
    const user = new User({
      id: 'u1',
      email: 'user@betrix.io',
      isAdmin: false,
      status: 'active',
      emailVerified: false,
      credits: 100,
      createdAt: new Date()
    });

    const updated = user.withDeductedCredits(30);
    expect(updated.credits).toBe(70);
    expect(user.credits).toBe(100); // Immutability preserved
  });

  it('should default User tier to free and support commercial tiers in toJSON', () => {
    const userDefault = new User({
      id: 'u-free',
      email: 'free@betrix.io',
      isAdmin: false,
      status: 'active',
      emailVerified: true,
      credits: 100,
      createdAt: new Date()
    });
    expect(userDefault.tier).toBe('free');
    expect(userDefault.toJSON().tier).toBe('free');

    const userVip = new User({
      id: 'u-vip',
      email: 'vip@betrix.io',
      isAdmin: false,
      status: 'active',
      tier: 'vip',
      emailVerified: true,
      credits: 100000,
      createdAt: new Date()
    });
    expect(userVip.tier).toBe('vip');
    expect(userVip.toJSON().tier).toBe('vip');
  });
});

describe('Domain - Intelligence & Indicators', () => {
  it('should parse and strip thinking tags synchronously', () => {
    const raw = '<think>Analyzing chart structure and RSI overbought</think>The market is showing strong bullish momentum.';
    const result = ThinkingFilter.parse(raw);
    expect(result.thinking).toBe('Analyzing chart structure and RSI overbought');
    expect(result.content).toBe('The market is showing strong bullish momentum.');
  });

  it('should route stream chunks accurately to onThink and onDelta', () => {
    const onThink = vi.fn();
    const onDelta = vi.fn();
    const router = ThinkingFilter.createStreamRouter({ onThink, onDelta });

    router.push('<think>step 1');
    router.push(' and step 2</think>Conclusion reached.');
    router.flush();

    expect(onThink).toHaveBeenCalled();
    expect(onDelta).toHaveBeenCalledWith('Conclusion reached.');
  });

  it('should calculate technical indicators (SMA, EMA, RSI, ATR, Support/Resistance)', () => {
    const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];

    // SMA
    const sma = IndicatorCalculator.calculateSMA(prices, 5);
    expect(sma).toBe(23); // (21+22+23+24+25)/5

    // RSI
    const rsi = IndicatorCalculator.calculateRSI(prices, 14);
    expect(rsi).toBeDefined();
    expect(rsi).toBeGreaterThan(70); // Continuous gains should give overbought RSI

    // Candles
    const candles = Array.from({ length: 25 }, (_, i) => ({
      time: 1000 + i * 60,
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 102 + i,
      volume: 1000
    }));

    const atr = IndicatorCalculator.calculateATR(candles, 14);
    expect(atr).toBeDefined();
    expect(atr).toBe(10); // High - Low = 10 constant

    const sr = IndicatorCalculator.calculateSupportResistance(candles, 20);
    expect(sr.recentHigh).toBeGreaterThan(0);
    expect(sr.recentLow).toBeGreaterThan(0);
  });

  it('should calculate dynamic token-based credit pricing via ModelPolicy', () => {
    // dahono/deepseek-v4-flash-0731 is 1 credit per 1k tokens
    expect(ModelPolicy.calculateCreditCost('dahono/deepseek-v4-flash-0731', 500)).toBe(1); // Min 1 credit
    expect(ModelPolicy.calculateCreditCost('dahono/deepseek-v4-flash-0731', 2500)).toBe(3); // ceil(2.5) = 3 credits

    // dahono/deepseek-v4-pro-0813 is 1 credit per 1k tokens
    expect(ModelPolicy.calculateCreditCost('dahono/deepseek-v4-pro-0813', 2000)).toBe(2); // 2 * 1 = 2 credits
  });
});

describe('Domain - Entity Rich Behaviors (Phase B)', () => {
  describe('OHLCBar', () => {
    it('calculates body size (|close - open|)', () => {
      const bullish = new OHLCBar({ time: 1000, open: 1.0800, high: 1.0860, low: 1.0790, close: 1.0850, volume: 100 });
      expect(bullish.body()).toBeCloseTo(0.005, 5);

      const bearish = new OHLCBar({ time: 1000, open: 1.0850, high: 1.0860, low: 1.0790, close: 1.0800, volume: 100 });
      expect(bearish.body()).toBeCloseTo(0.005, 5);
    });

    it('calculates range (high - low)', () => {
      const bar = new OHLCBar({ time: 1000, open: 1.0800, high: 1.0860, low: 1.0790, close: 1.0850, volume: 100 });
      expect(bar.range()).toBeCloseTo(0.007, 5);
    });

    it('detects bullish vs bearish candles', () => {
      const bullish = new OHLCBar({ time: 1000, open: 1.0800, high: 1.0860, low: 1.0790, close: 1.0850, volume: 100 });
      expect(bullish.isBullish()).toBe(true);
      expect(bullish.isBearish()).toBe(false);

      const bearish = new OHLCBar({ time: 1000, open: 1.0850, high: 1.0860, low: 1.0790, close: 1.0800, volume: 100 });
      expect(bearish.isBullish()).toBe(false);
      expect(bearish.isBearish()).toBe(true);
    });

    it('detects weekend candles (Saturday UTC)', () => {
      // Saturday 2024-01-06 12:00 UTC = 1704552000
      const satBar = new OHLCBar({ time: 1704552000, open: 1.08, high: 1.09, low: 1.07, close: 1.085, volume: 0 });
      expect(satBar.isWeekend()).toBe(true);

      // Monday 2024-01-08 12:00 UTC = 1704724800
      const monBar = new OHLCBar({ time: 1704724800, open: 1.08, high: 1.09, low: 1.07, close: 1.085, volume: 100 });
      expect(monBar.isWeekend()).toBe(false);
    });
  });

  describe('PriceTick', () => {
    it('calculates mid-price as last', () => {
      const tick = new PriceTick({ symbol: 'EURUSD', bid: 1.0850, ask: 1.0852, spread: 2, volume: 100, timestamp: 1700000000000 });
      expect(tick.last).toBe(1.0851);
    });

    it('calculates 24h change statically', () => {
      const change = PriceTick.calculate24hChange(1.0850, 1.0800);
      expect(change.changeAmount).toBe(0.005);
      expect(change.changePercent).toBe(0.46);

      // Zero d1Open guard
      const zeroChange = PriceTick.calculate24hChange(1.0850, 0);
      expect(zeroChange.changeAmount).toBe(0);
      expect(zeroChange.changePercent).toBe(0);
    });

    it('normalizes symbol to uppercase', () => {
      const tick = new PriceTick({ symbol: 'eurusd', bid: 1.08, ask: 1.09, spread: 1, volume: 50, timestamp: 1700000000000 });
      expect(tick.symbol).toBe('EURUSD');
    });
  });

  describe('AiAgent', () => {
    it('calculates credit cost from token count', () => {
      const agent = new AiAgent({ id: 'test', name: 'Test', modelName: 'model', creditsPer1kTokens: 2 });
      expect(agent.calculateCredits(500)).toBe(1);   // min 1
      expect(agent.calculateCredits(1000)).toBe(2);   // 1k * 2 = 2
      expect(agent.calculateCredits(2500)).toBe(5);   // 2.5k * 2 = 5
    });

    it('detects custom gateway configuration', () => {
      const defaultAgent = new AiAgent({ id: 'a', name: 'A', modelName: 'm' });
      expect(defaultAgent.hasCustomGateway()).toBe(false);
      expect(defaultAgent.hasCustomApiKey()).toBe(false);

      const customAgent = new AiAgent({ id: 'b', name: 'B', modelName: 'm', baseUrl: 'http://localhost:20128/v1', apiKey: 'secret' });
      expect(customAgent.hasCustomGateway()).toBe(true);
      expect(customAgent.hasCustomApiKey()).toBe(true);
    });
  });

  describe('Symbol', () => {
    it('isTradable only when active and has at least one mapping', () => {
      const active = new Symbol({ symbol: 'EURUSD', category: 'forex', isActive: true, finnhubSymbol: 'OANDA:EUR_USD', dukascopySymbol: 'eurusd', createdAt: new Date(), updatedAt: new Date() });
      expect(active.isTradable()).toBe(true);

      const noMapping = new Symbol({ symbol: 'TEST', category: 'forex', isActive: true, createdAt: new Date(), updatedAt: new Date() });
      expect(noMapping.isTradable()).toBe(false);

      const inactive = new Symbol({ symbol: 'EURUSD', category: 'forex', isActive: false, finnhubSymbol: 'OANDA:EUR_USD', createdAt: new Date(), updatedAt: new Date() });
      expect(inactive.isTradable()).toBe(false);
    });

    it('checks individual mapping presence', () => {
      const sym = new Symbol({ symbol: 'EURUSD', category: 'forex', isActive: true, finnhubSymbol: 'OANDA:EUR_USD', dukascopySymbol: 'eurusd', createdAt: new Date(), updatedAt: new Date() });
      expect(sym.hasFinnhubMapping()).toBe(true);
      expect(sym.hasDukascopyMapping()).toBe(true);

      const partial = new Symbol({ symbol: 'X', category: 'forex', isActive: true, dukascopySymbol: 'x', createdAt: new Date(), updatedAt: new Date() });
      expect(partial.hasFinnhubMapping()).toBe(false);
      expect(partial.hasDukascopyMapping()).toBe(true);
    });
  });

  describe('CreditTransaction', () => {
    it('classifies deduction vs addition', () => {
      const deduction = new CreditTransaction({ id: 't1', userId: 'u1', amount: -5, action: 'AI_CHAT', createdAt: new Date() });
      expect(deduction.isDeduction()).toBe(true);
      expect(deduction.isAddition()).toBe(false);
      expect(deduction.absoluteAmount()).toBe(5);

      const addition = new CreditTransaction({ id: 't2', userId: 'u1', amount: 100, action: 'VOUCHER_REDEEM', createdAt: new Date() });
      expect(addition.isDeduction()).toBe(false);
      expect(addition.isAddition()).toBe(true);
      expect(addition.absoluteAmount()).toBe(100);
    });
  });

  describe('NewsArticle', () => {
    it('calculates age in seconds', () => {
      const recent = new NewsArticle({ id: 'n1', source: 'Reuters', headline: 'Test', url: 'http://x', summary: 's', datetime: Math.floor(Date.now() / 1000) - 300, category: 'forex' });
      expect(recent.age()).toBeGreaterThanOrEqual(295);
      expect(recent.age()).toBeLessThanOrEqual(310);
    });

    it('detects recency within threshold', () => {
      const fresh = new NewsArticle({ id: 'n1', source: 'R', headline: 'H', url: 'http://x', summary: 's', datetime: Math.floor(Date.now() / 1000) - 60, category: 'forex' });
      expect(fresh.isRecent(300)).toBe(true);
      expect(fresh.isRecent(30)).toBe(false);
    });

    it('matches symbol by tag or headline', () => {
      const article = new NewsArticle({ id: 'n1', source: 'R', headline: 'EURUSD rallies', url: 'http://x', summary: 'Euro gains', datetime: 1700000000, category: 'forex', tags: ['eur', 'usd'] });
      expect(article.matchesSymbol('EURUSD')).toBe(true);
      expect(article.matchesSymbol('XAUUSD')).toBe(false);
    });
  });

  describe('MarketTimeCalculator', () => {
    it('calculates lookback days for various timeframes', () => {
      expect(MarketTimeCalculator.calculateLookbackDays('m1', 100)).toBeGreaterThanOrEqual(2);
      expect(MarketTimeCalculator.calculateLookbackDays('h1', 100)).toBeGreaterThanOrEqual(10);
      expect(MarketTimeCalculator.calculateLookbackDays('d1', 30)).toBeGreaterThanOrEqual(60);
      expect(MarketTimeCalculator.calculateLookbackDays('mn1', 12)).toBeGreaterThanOrEqual(365);
    });
  });

  describe('ChatMessage', () => {
    it('calculates totalTokens', () => {
      const msg = new ChatMessage({ id: 'c1', userId: 'u1', sessionId: 's1', taskType: 'market_analysis', modelUsed: 'm', message: 'hi', reply: 'hello', latencyMs: 100, inputTokens: 50, outputTokens: 30, createdAt: new Date() });
      expect(msg.totalTokens).toBe(80);
    });

    it('serializes to JSON with all fields', () => {
      const now = new Date();
      const msg = new ChatMessage({ id: 'c2', userId: 'u2', sessionId: 's2', taskType: 'trade_reasoning', modelUsed: 'deepseek-v4-pro', message: 'Analyze BTC', reply: 'BTC is bullish', latencyMs: 250, inputTokens: 100, outputTokens: 80, createdAt: now });
      const json = msg.toJSON();
      expect(json.id).toBe('c2');
      expect(json.taskType).toBe('trade_reasoning');
      expect(json.inputTokens).toBe(100);
      expect(json.outputTokens).toBe(80);
    });
  });

  describe('CreditVoucher', () => {
    it('isRedeemable when not redeemed and not expired', () => {
      const valid = new CreditVoucher({ id: 'v1', code: 'ABC', amount: 100, isRedeemed: false, createdAt: new Date() });
      expect(valid.isValid()).toBe(true);

      const redeemed = new CreditVoucher({ id: 'v2', code: 'DEF', amount: 100, isRedeemed: true, createdAt: new Date() });
      expect(redeemed.isValid()).toBe(false);

      const expired = new CreditVoucher({ id: 'v3', code: 'GHI', amount: 100, isRedeemed: false, expiresAt: new Date(Date.now() - 1000), createdAt: new Date() });
      expect(expired.isValid()).toBe(false);
    });
  });

  describe('Session', () => {
    it('detects expiry', () => {
      const active = new Session({ id: 's1', userId: 'u1', token: 'tok', deviceFingerprint: 'fp', expiresAt: new Date(Date.now() + 86400000), createdAt: new Date() });
      expect(active.isExpired()).toBe(false);

      const expired = new Session({ id: 's2', userId: 'u1', token: 'tok', deviceFingerprint: 'fp', expiresAt: new Date(Date.now() - 1000), createdAt: new Date() });
      expect(expired.isExpired()).toBe(true);
    });

    it('serializes to JSON without exposing the session token', () => {
      const now = new Date();
      const session = new Session({ id: 's1', userId: 'u1', token: 'tok123', deviceFingerprint: 'fp', ip: '127.0.0.1', userAgent: 'Chrome/120', expiresAt: new Date(now.getTime() + 86400000), createdAt: now });
      const json = session.toJSON();
      expect(json.id).toBe('s1');
      expect(json.userId).toBe('u1');
      expect('token' in json).toBe(false);
      expect(json.ip).toBe('127.0.0.1');
      expect(json.userAgent).toBe('Chrome/120');
    });

    it('defaults ip and userAgent to null when not provided', () => {
      const session = new Session({ id: 's1', userId: 'u1', token: 'tok', deviceFingerprint: 'fp', expiresAt: new Date(), createdAt: new Date() });
      expect(session.ip).toBeNull();
      expect(session.userAgent).toBeNull();
    });
  });

  describe('User', () => {
    it('checks active status and credit affordability', () => {
      const user = new User({ id: 'u1', email: 'a@b.com', isAdmin: false, status: 'active', emailVerified: false, credits: 50, createdAt: new Date() });
      expect(user.isActive()).toBe(true);
      expect(user.hasSufficientCredits(50)).toBe(true);
      expect(user.hasSufficientCredits(51)).toBe(false);
    });

    it('creates updated copies immutably', () => {
      const user = new User({ id: 'u1', email: 'a@b.com', isAdmin: false, status: 'active', emailVerified: false, credits: 100, createdAt: new Date() });
      const withMore = user.withAddedCredits(25);
      expect(withMore.credits).toBe(125);
      expect(user.credits).toBe(100);

      const verified = user.withEmailVerified();
      expect(verified.emailVerified).toBe(true);
      expect(user.emailVerified).toBe(false);
    });

    it('withUpdatedProfile updates name and bio immutably', () => {
      const user = new User({ id: 'u1', email: 'a@b.com', isAdmin: false, status: 'active', emailVerified: false, credits: 100, createdAt: new Date() });
      const updated = user.withUpdatedProfile({ name: 'New Name', bio: 'New bio' });
      expect(updated.name).toBe('New Name');
      expect(updated.bio).toBe('New bio');
      // Original unchanged — name defaults to null, not undefined
      expect(user.name).toBeFalsy();
      expect(user.bio).toBeFalsy();
    });

    it('reports inactive status correctly', () => {
      const user = new User({ id: 'u1', email: 'a@b.com', isAdmin: false, status: 'suspended', emailVerified: false, credits: 100, createdAt: new Date() });
      expect(user.isActive()).toBe(false);
    });
  });
});

  describe('Device', () => {
    it('creates withUpdatedLastSeen that returns a new instance', () => {
      const past = new Date(Date.now() - 60000);
      const device = new Device({ id: 'd1', userId: 'u1', fingerprint: 'fp1', lastSeenAt: past, createdAt: past });
      const updated = device.withUpdatedLastSeen();
      expect(updated.lastSeenAt.getTime()).toBeGreaterThan(past.getTime());
      expect(device.lastSeenAt).toEqual(past); // original unchanged
    });

    it('serializes to JSON with all fields', () => {
      const now = new Date();
      const device = new Device({ id: 'd1', userId: 'u1', fingerprint: 'fp1', lastSeenAt: now, createdAt: now });
      const json = device.toJSON();
      expect(json.id).toBe('d1');
      expect(json.fingerprint).toBe('fp1');
      expect(json.userId).toBe('u1');
    });
  });

  describe('Message', () => {
    it('isRead returns correct status', () => {
      const read = new Message({ id: 'm1', fromUserId: 'u1', toUserId: 'u2', subject: 'Hi', body: 'Hello', threadId: 't1', readAt: new Date(), createdAt: new Date() });
      expect(read.isRead()).toBe(true);

      const unread = new Message({ id: 'm2', fromUserId: 'u1', toUserId: 'u2', subject: 'Hi', body: 'Hello', threadId: 't1', createdAt: new Date() });
      expect(unread.isRead()).toBe(false);
    });

    it('withMarkedAsRead returns new instance with readAt set', () => {
      const msg = new Message({ id: 'm1', fromUserId: 'u1', toUserId: 'u2', subject: 'Hi', body: 'Hello', threadId: 't1', createdAt: new Date() });
      expect(msg.isRead()).toBe(false);
      const readMsg = msg.withMarkedAsRead();
      expect(readMsg.isRead()).toBe(true);
      expect(msg.isRead()).toBe(false); // original unchanged
    });

    it('serializes to JSON', () => {
      const msg = new Message({ id: 'm1', fromUserId: 'u1', toUserId: 'u2', subject: 'Hi', body: 'Hello', threadId: 't1', createdAt: new Date() });
      const json = msg.toJSON();
      expect(json.id).toBe('m1');
      expect(json.subject).toBe('Hi');
      expect(json.readAt).toBeNull();
    });
  });

describe('Domain - News & Shared Kernel', () => {
  it('should tag news articles automatically based on keywords', () => {
    const tags1 = NewsTagging.tagArticle('Fed Chair Powell warns on CPI inflation', 'Federal reserve considers rate pause');
    expect(tags1).toContain('usd');

    const tags2 = NewsTagging.tagArticle('Bitcoin ETF inflows break records as Halving approaches', 'Crypto asset rally continues');
    expect(tags2).toContain('btc');

    const tags3 = NewsTagging.tagArticle('Gold surges to new all time high', 'XAU bullion demand rises');
    expect(tags3).toContain('metal');

    const tags4 = NewsTagging.tagArticle('Random headline with no matching keywords', 'Nothing special');
    expect(tags4).toEqual(['global']);
  });

  it('should dispatch and handle domain events via EventDispatcher', async () => {
    const dispatcher = new EventDispatcher();
    dispatcher.clear();

    const handler = vi.fn();
    dispatcher.register('TEST_EVENT', handler);

    await dispatcher.dispatch('TEST_EVENT', { data: 'hello' });
    expect(handler).toHaveBeenCalledWith({ data: 'hello' });
  });

  describe('Domain - BackgroundWorker Entity', () => {
    it('enforces worker validation invariants and lifecycle transitions', () => {
      expect(() => new BackgroundWorker({ id: '', name: '', category: 'market', description: '', interval: '10s' })).toThrow(ValidationError);

      const worker = new BackgroundWorker({
        id: 'test-worker',
        name: 'Test Worker',
        category: 'market',
        description: 'Test worker description',
        interval: '10s',
        status: 'running',
        processedCount: 10
      });

      expect(worker.status).toBe('running');
      expect(worker.uptimeSeconds).toBeGreaterThanOrEqual(0);

      worker.pause();
      expect(worker.status).toBe('paused');
      expect(worker.uptimeSeconds).toBe(0);

      worker.start();
      expect(worker.status).toBe('running');

      worker.recordExecution(5);
      expect(worker.processedCount).toBe(15);

      worker.recordError('Connection failed');
      expect(worker.status).toBe('error');
      expect(worker.errorCount).toBe(1);
      expect(worker.lastError).toBe('Connection failed');

      worker.restart();
      expect(worker.status).toBe('running');
      expect(worker.processedCount).toBe(16);

      const json = worker.toJSON();
      expect(json.id).toBe('test-worker');
      expect(json.status).toBe('running');
    });
  });
});
