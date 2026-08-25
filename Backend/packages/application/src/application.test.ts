import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  RegisterSchema,
  LoginSchema,
  SendMessageSchema,
  MarketContextOptionsSchema,
  GetOHLCParamsSchema,
  CreateVoucherSchema,
  RedeemVoucherSchema
} from './schemas/index.js';
import {
  CaptchaService,
  AuthService,
  MarketDataService,
  NewsService,
  ContextInjectionService,
  WorkerManagerService
} from './services/index.js';
import {
  RegisterUseCase,
  LoginUseCase,
  GoogleOAuthUseCase,
  VerifyEmailUseCase,
  ResendVerificationUseCase,
  ForgotPasswordUseCase,
  ResetPasswordUseCase,
  ChangePasswordUseCase,
  ChangeEmailUseCase,
  GetStreamTicketUseCase,
  RevokeSessionUseCase,
  LogoutAllUseCase,
  GetProfileUseCase,
  UpdateProfileUseCase,
  RedeemVoucherUseCase
} from './use-cases/identity/index.js';
import {
  SendMessageUseCase,
  StreamMessageUseCase,
  GetChatHistoryUseCase,
  DeleteChatSessionUseCase,
  ExportChatUseCase,
  ListModelsUseCase,
  CreateAgentUseCase,
  ListAgentsUseCase,
  SetDefaultAgentUseCase,
  TestAgentUseCase
} from './use-cases/intelligence/index.js';
import { GetSymbolsUseCase, GetPricesUseCase, GetOHLCUseCase } from './use-cases/market/index.js';
import { FetchNewsUseCase, StoreNewsUseCase, GetNewsUseCase } from './use-cases/news/index.js';
import {
  GetInboxUseCase,
  GetSentMessagesUseCase,
  GetThreadUseCase,
  SendUserMessageUseCase,
  MarkMessageReadUseCase,
  DeleteMessageUseCase,
  UpdateNotificationPrefsUseCase
} from './use-cases/messaging/index.js';
import {
  GetAdminUsersUseCase,
  GetAdminUserDetailUseCase,
  UpdateAdminUserUseCase,
  CreateAdminUserUseCase,
  DeleteAdminUserUseCase,
  ResetUserPasswordUseCase,
  CreateVoucherUseCase,
  ListVouchersUseCase,
  RevokeVoucherUseCase,
  GetSystemMetricsUseCase,
  GetAnalyticsUseCase,
  GetAuditLogsUseCase,
  ExportAuditLogsUseCase,
  BroadcastMessageUseCase,
  SystemCleanupUseCase,
  GetAdminUserChatHistoryUseCase
} from './use-cases/admin/index.js';
import { ChatLoggingHandler } from './handlers/ChatLoggingHandler.js';
import {
  User,
  Session,
  Device,
  Symbol,
  OHLCBar,
  PriceTick,
  NewsArticle,
  Message,
  AdminAction,
  CreditVoucher,
  EventDispatcher
} from '@betrix/domain';

// Mock in-memory store helpers
class InMemoryCaptchaStore {
  private store = new Map<string, string>();
  async save(id: string, ans: string): Promise<void> {
    this.store.set(id, ans);
  }
  async getAndDelete(id: string): Promise<string | null> {
    const val = this.store.get(id) || null;
    this.store.delete(id);
    return val;
  }
}

class InMemoryTicketStore {
  private store = new Map<string, string>();
  async save(ticket: string, userId: string): Promise<void> {
    this.store.set(ticket, userId);
  }
  async getAndDelete(ticket: string): Promise<string | null> {
    const val = this.store.get(ticket) || null;
    this.store.delete(ticket);
    return val;
  }
}

describe('Betrix-Reborn — Phase 4 Application Layer Tests', () => {
  // ==========================================
  // 1. TYPEBOX SCHEMAS VALIDATION TESTS
  // ==========================================
  describe('TypeBox Schemas & DTOs', () => {
    it('validates RegisterSchema correctly', () => {
      const valid = {
        email: 'trader@betrix.io',
        password: 'Password123!',
        name: 'Elite Trader',
        deviceFingerprint: 'fp_1234567890abcdef'
      };
      expect(Value.Check(RegisterSchema, valid)).toBe(true);

      const invalid = {
        email: 'invalid-email',
        password: 'short',
        deviceFingerprint: ''
      };
      expect(Value.Check(RegisterSchema, invalid)).toBe(false);
    });

    it('validates LoginSchema and CAPTCHA fields', () => {
      const valid = {
        email: 'trader@betrix.io',
        password: 'Password123!',
        deviceFingerprint: 'fp_1234567890abcdef',
        captchaId: 'cap_123',
        captchaAnswer: '15'
      };
      expect(Value.Check(LoginSchema, valid)).toBe(true);
    });

    it('validates SendMessageSchema and MarketContextOptions', () => {
      const valid = {
        sessionId: 'session-123',
        taskType: 'market_analysis',
        model: 'deepseek-reasoner',
        message: 'Analyze EURUSD momentum at current levels',
        marketContext: {
          symbol: 'EURUSD',
          timeframe: 'h1',
          candleCount: 50,
          indicators: {
            sma: [20, 50, 200],
            rsi: true,
            atr: true,
            supportResistance: true
          },
          includeNews: true
        }
      };
      expect(Value.Check(SendMessageSchema, valid)).toBe(true);
    });

    it('validates Voucher Schemas (ADR-29)', () => {
      const createVoucher = { amount: 500, code: 'WELCOME500' };
      expect(Value.Check(CreateVoucherSchema, createVoucher)).toBe(true);

      const redeemVoucher = { code: 'WELCOME500' };
      expect(Value.Check(RedeemVoucherSchema, redeemVoucher)).toBe(true);
    });
  });

  // ==========================================
  // 2. APPLICATION SERVICES TESTS
  // ==========================================
  describe('Application Services', () => {
    it('CaptchaService generates math challenges and verifies single-use answer', async () => {
      const store = new InMemoryCaptchaStore();
      const captchaService = new CaptchaService(store as any);

      const challenge = await captchaService.generateChallenge();
      expect(challenge.id).toBeDefined();
      expect(challenge.question).toMatch(/What is \d+ [+-] \d+\?/);

      // Extract expected answer from math question
      const match = challenge.question.match(/What is (\d+) ([+-]) (\d+)\?/);
      expect(match).toBeTruthy();
      const num1 = parseInt(match![1]!, 10);
      const op = match![2]!;
      const num2 = parseInt(match![3]!, 10);
      const expectedAnswer = String(op === '+' ? num1 + num2 : num1 - num2);

      const isValid = await captchaService.verify(challenge.id, expectedAnswer);
      expect(isValid).toBe(true);

      // Replay attack check: Second verification must fail (burned)
      const isReplayed = await captchaService.verify(challenge.id, expectedAnswer);
      expect(isReplayed).toBe(false);
    });

    it('MarketDataService calculates 24h change and retrieves OHLC (ADR-27)', async () => {
      const mockSymbolRepo = {
        findAll: vi.fn().mockResolvedValue([
          new Symbol({
            symbol: 'EURUSD',
            category: 'forex',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        ]),
        findByCategory: vi.fn().mockResolvedValue([]),
        findBySymbol: vi.fn().mockResolvedValue(
          new Symbol({
            symbol: 'EURUSD',
            category: 'forex',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        )
      };

      const mockCacheStore = {
        getOHLC: vi.fn().mockResolvedValue(null),
        cacheOHLC: vi.fn().mockResolvedValue(undefined),
        getPrice: vi.fn().mockResolvedValue(null),
        getAllPrices: vi.fn().mockResolvedValue([])
      };

      const mockHistoricalProvider = {
        fetchHistory: vi.fn().mockResolvedValue([
          new OHLCBar({
            time: 1000,
            open: 1.08,
            high: 1.085,
            low: 1.079,
            close: 1.084,
            volume: 100
          })
        ])
      };

      const marketDataService = new MarketDataService(
        mockSymbolRepo as any,
        mockCacheStore as any,
        mockHistoricalProvider as any
      );

      // Test 24h change calculation
      const change = marketDataService.calculate24hChange(1.085, 1.08);
      expect(change.changeAmount).toBe(0.005);
      expect(change.changePercent).toBe(0.46);

      // Test D1 OHLC fetch delegates to historical provider (cache logic is in adapter)
      const bars = await marketDataService.getOHLC('EURUSD', 'd1', 30);
      expect(bars).toHaveLength(1);
      expect(mockHistoricalProvider.fetchHistory).toHaveBeenCalled();
    });

    it('MarketDataService.getOHLC trims results to requested limit', async () => {
      const mockSymbolRepo = { findAll: vi.fn(), findByCategory: vi.fn(), findBySymbol: vi.fn() };
      const mockCacheStore = {
        getOHLC: vi.fn(),
        cacheOHLC: vi.fn(),
        getPrice: vi.fn(),
        getAllPrices: vi.fn()
      };
      const fiveBars = Array.from(
        { length: 5 },
        (_, i) =>
          new OHLCBar({
            time: 1000 + i * 60,
            open: 1.08,
            high: 1.09,
            low: 1.07,
            close: 1.085,
            volume: 100
          })
      );
      const mockHistoricalProvider = { fetchHistory: vi.fn().mockResolvedValue(fiveBars) };

      const service = new MarketDataService(
        mockSymbolRepo as any,
        mockCacheStore as any,
        mockHistoricalProvider as any
      );
      const bars = await service.getOHLC('EURUSD', 'h1', 3);
      expect(bars).toHaveLength(3); // trimmed from 5 to 3
    });

    it('MarketDataService.getSymbol returns uppercase-normalized lookup', async () => {
      const mockSymbolRepo = {
        findAll: vi.fn(),
        findByCategory: vi.fn(),
        findBySymbol: vi.fn().mockResolvedValue(
          new Symbol({
            symbol: 'EURUSD',
            category: 'forex',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        )
      };
      const mockCacheStore = {
        getOHLC: vi.fn(),
        cacheOHLC: vi.fn(),
        getPrice: vi.fn(),
        getAllPrices: vi.fn()
      };
      const mockHistoricalProvider = { fetchHistory: vi.fn() };

      const service = new MarketDataService(
        mockSymbolRepo as any,
        mockCacheStore as any,
        mockHistoricalProvider as any
      );
      const sym = await service.getSymbol('eurusd');
      expect(mockSymbolRepo.findBySymbol).toHaveBeenCalledWith('EURUSD');
      expect(sym).not.toBeNull();
    });

    it('MarketDataService delegates getPrice and getAllPrices to cacheStore', async () => {
      const tick = new PriceTick({
        symbol: 'EURUSD',
        bid: 1.085,
        ask: 1.0852,
        spread: 2,
        volume: 100,
        timestamp: Date.now()
      });
      const mockSymbolRepo = { findAll: vi.fn(), findByCategory: vi.fn(), findBySymbol: vi.fn() };
      const mockCacheStore = {
        getOHLC: vi.fn(),
        cacheOHLC: vi.fn(),
        getPrice: vi.fn().mockResolvedValue(tick),
        getAllPrices: vi.fn().mockResolvedValue([tick])
      };
      const mockHistoricalProvider = { fetchHistory: vi.fn() };

      const service = new MarketDataService(
        mockSymbolRepo as any,
        mockCacheStore as any,
        mockHistoricalProvider as any
      );

      const singlePrice = await service.getPrice('EURUSD');
      expect(singlePrice?.symbol).toBe('EURUSD');

      const allPrices = await service.getAllPrices();
      expect(allPrices).toHaveLength(1);
    });

    it('ContextInjectionService computes indicators and formats market context with fallback (ADR-28)', async () => {
      const mockBars: OHLCBar[] = [];
      let basePrice = 1.08;
      for (let i = 0; i < 40; i++) {
        basePrice += i % 2 === 0 ? 0.001 : -0.0005;
        mockBars.push(
          new OHLCBar({
            time: 10000 + i * 3600,
            open: basePrice,
            high: basePrice + 0.002,
            low: basePrice - 0.001,
            close: basePrice + 0.0005,
            volume: 500
          })
        );
      }

      const mockMarketDataService = {
        getOHLC: vi.fn().mockResolvedValue(mockBars)
      };

      const mockNewsService = {
        getRecentNews: vi.fn().mockResolvedValue([
          new NewsArticle({
            id: 'n1',
            source: 'Reuters',
            headline: 'ECB hints at rate pause',
            summary: 'European Central Bank signals monetary stability.',
            url: 'https://reuters.com/1',
            datetime: 1700000000,
            category: 'forex',
            tags: ['eur', 'ecb']
          })
        ])
      };

      const contextService = new ContextInjectionService(
        mockMarketDataService as any,
        mockNewsService as any
      );

      const result = await contextService.buildMarketContext({
        symbol: 'EURUSD',
        timeframe: 'h1',
        candleCount: 30,
        indicators: { sma: [20], rsi: true, atr: true, supportResistance: true },
        includeNews: true
      });

      expect(result.contextBlock).toContain('MARKET CONTEXT: EURUSD (H1)');
      expect(result.contextBlock).toContain('SMA(20)');
      expect(result.contextBlock).toContain('RSI(14)');
      expect(result.contextBlock).toContain('ATR(14)');
      expect(result.contextBlock).toContain('ECB hints at rate pause');
      expect(result.metadata.candlesLoaded).toBe(40);
      expect(result.metadata.indicatorsComputed).toBe(true);

      // Test Graceful Fallback on provider failure
      mockMarketDataService.getOHLC.mockRejectedValueOnce(new Error('Dukascopy network timeout'));
      const fallbackResult = await contextService.buildMarketContext({
        symbol: 'XAUUSD',
        timeframe: 'h1'
      });
      expect(fallbackResult.contextBlock).toContain(
        'Notice: Live/Historical candle data for XAUUSD is currently unavailable'
      );
    });

    it('WorkerManagerService auto-discovers and controls modular background workers', async () => {
      const onStartMock = vi.fn();
      const onPauseMock = vi.fn();

      const customWorker = {
        id: 'custom-ai-sentiment',
        name: 'Custom AI Sentiment Worker',
        category: 'intelligence' as const,
        description: 'Analyzes financial sentiment.',
        interval: '5m',
        defaultStatus: 'running' as const,
        initialProcessedCount: 42,
        onStart: onStartMock,
        onPause: onPauseMock
      };

      const manager = new WorkerManagerService([customWorker]);
      const workers = await manager.getAllWorkers();

      expect(workers).toHaveLength(1);
      expect(workers[0].id).toBe('custom-ai-sentiment');
      expect(workers[0].status).toBe('running');
      expect(workers[0].processedCount).toBe(42);

      // Pause worker
      const paused = await manager.controlWorker('custom-ai-sentiment', 'pause');
      expect(paused.status).toBe('paused');
      expect(onPauseMock).toHaveBeenCalled();

      // Start worker
      const restarted = await manager.controlWorker('custom-ai-sentiment', 'start');
      expect(restarted.status).toBe('running');
      expect(onStartMock).toHaveBeenCalled();
    });
  });

  // ==========================================
  // 3. USE CASES TESTS
  // ==========================================
  describe('Use Cases — Identity, Intelligence, Market, News, Messaging, Admin', () => {
    let mockUser: User;
    let mockUsersDb: Map<string, User>;
    let mockSessionsDb: Map<string, Session>;
    let mockDevicesDb: Map<string, Device>;
    let mockVouchersDb: Map<string, CreditVoucher>;
    let mockUserRepo: any;
    let mockSessionRepo: any;
    let mockDeviceRepo: any;
    let mockVerificationRepo: any;
    let mockVoucherRepo: any;
    let mockCreditRepo: any;
    let mockChatRepo: any;
    let authService: AuthService;

    beforeEach(() => {
      mockUsersDb = new Map();
      mockSessionsDb = new Map();
      mockDevicesDb = new Map();
      mockVouchersDb = new Map();

      mockUser = new User({
        id: 'usr-1',
        email: 'trader@betrix.io',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuv', // valid mock hash
        name: 'Pro Trader',
        isAdmin: false,
        status: 'active',
        emailVerified: false,
        credits: 100,
        createdAt: new Date()
      });
      mockUsersDb.set(mockUser.id, mockUser);

      mockUserRepo = {
        findById: vi.fn(async (id: string) => mockUsersDb.get(id) || null),
        findByEmail: vi.fn(
          async (email: string) =>
            Array.from(mockUsersDb.values()).find((u) => u.email === email) || null
        ),
        findByGoogleId: vi.fn(async () => null),
        save: vi.fn(async (u: User) => {
          mockUsersDb.set(u.id, u);
          return u;
        }),
        update: vi.fn(async (u: User) => {
          mockUsersDb.set(u.id, u);
          return u;
        }),
        delete: vi.fn(async (id: string) => {
          return mockUsersDb.delete(id);
        }),
        findAll: vi.fn(async () => ({
          data: Array.from(mockUsersDb.values()),
          total: mockUsersDb.size,
          page: 1,
          limit: 20,
          totalPages: 1
        }))
      };

      mockSessionRepo = {
        save: vi.fn(async (s: Session) => {
          mockSessionsDb.set(s.token, s);
          return s;
        }),
        findByToken: vi.fn(async (t: string) => mockSessionsDb.get(t) || null),
        findByUserId: vi.fn(async (uid: string) =>
          Array.from(mockSessionsDb.values()).filter((s) => s.userId === uid)
        ),
        delete: vi.fn(async (t: string) => mockSessionsDb.delete(t)),
        deleteByUserId: vi.fn(async (uid: string) => {
          let count = 0;
          for (const [k, v] of mockSessionsDb.entries()) {
            if (v.userId === uid) {
              mockSessionsDb.delete(k);
              count++;
            }
          }
          return count;
        }),
        deleteExpired: vi.fn(async () => 0)
      };

      mockDeviceRepo = {
        findByFingerprint: vi.fn(async (fp: string) => mockDevicesDb.get(fp) || null),
        findByUserId: vi.fn(async (uid: string) =>
          Array.from(mockDevicesDb.values()).filter((d) => d.userId === uid)
        ),
        save: vi.fn(async (d: Device) => {
          mockDevicesDb.set(d.fingerprint, d);
          return d;
        }),
        updateLastSeen: vi.fn(async () => true),
        deleteByUserId: vi.fn(async () => 0)
      };

      mockVerificationRepo = {
        create: vi.fn(async (userId, token, type) => ({
          id: 'v-1',
          userId,
          token,
          type,
          expiresAt: new Date(Date.now() + 3600000),
          createdAt: new Date()
        })),
        verify: vi.fn(async (token, type) => ({
          id: 'v-1',
          userId: 'usr-1',
          token,
          type,
          expiresAt: new Date(Date.now() + 3600000),
          createdAt: new Date()
        })),
        invalidateUserTokens: vi.fn(async () => 1),
        cleanupExpired: vi.fn(async () => 0)
      };

      mockVoucherRepo = {
        create: vi.fn(async (v: CreditVoucher) => {
          mockVouchersDb.set(v.code, v);
          return v;
        }),
        findByCode: vi.fn(async (code: string) => mockVouchersDb.get(code) || null),
        findById: vi.fn(
          async (id: string) => Array.from(mockVouchersDb.values()).find((v) => v.id === id) || null
        ),
        redeemAtomically: vi.fn(
          async (id: string, userId: string, amount: number, _action: string) => {
            const voucher = Array.from(mockVouchersDb.values()).find((v) => v.id === id);
            if (!voucher || voucher.isRedeemed) return { redeemed: false, newBalance: 0 };
            const burned = new CreditVoucher({
              ...voucher['props'],
              isRedeemed: true,
              redeemedById: userId,
              redeemedAt: new Date()
            });
            mockVouchersDb.set(burned.code, burned);

            // Mirror the in-memory credit grant so balances stay consistent.
            const user = mockUsersDb.get(userId);
            if (user) {
              const updated = user.withAddedCredits(amount);
              mockUsersDb.set(userId, updated);
              return { redeemed: true, newBalance: updated.credits };
            }
            return { redeemed: true, newBalance: 0 };
          }
        ),
        revoke: vi.fn(async (id: string) => {
          const voucher = Array.from(mockVouchersDb.values()).find((v) => v.id === id);
          if (voucher) {
            mockVouchersDb.delete(voucher.code);
            return true;
          }
          return false;
        }),
        findAll: vi.fn(async () => ({
          data: Array.from(mockVouchersDb.values()),
          total: mockVouchersDb.size,
          page: 1,
          limit: 20,
          totalPages: 1
        }))
      };

      mockCreditRepo = {
        getBalance: vi.fn(async (uid: string) => mockUsersDb.get(uid)?.credits ?? 0),
        addCredits: vi.fn(async (uid: string, amount: number) => {
          const u = mockUsersDb.get(uid);
          if (u) {
            const updated = u.withAddedCredits(amount);
            mockUsersDb.set(uid, updated);
            return updated.credits;
          }
          return 0;
        }),
        deductCredits: vi.fn(async (uid: string, amount: number) => {
          const u = mockUsersDb.get(uid);
          if (u) {
            const updated = u.withDeductedCredits(amount);
            mockUsersDb.set(uid, updated);
            return updated.credits;
          }
          return 0;
        }),
        reserveCredits: vi.fn(async (uid: string, amount: number) => {
          const u = mockUsersDb.get(uid);
          return !!u && u.credits >= amount;
        }),
        settleReservation: vi.fn(async (uid: string, _reserved: number, actualCost: number) => {
          const u = mockUsersDb.get(uid);
          if (u) {
            const updated = u.withDeductedCredits(actualCost);
            mockUsersDb.set(uid, updated);
            return updated.credits;
          }
          return 0;
        })
      };

      mockChatRepo = {
        save: vi.fn(async (msg) => msg),
        findBySessionId: vi.fn(async () => []),
        findRecentBySessionId: vi.fn(async () => []),
        findByUserId: vi.fn(async () => ({
          data: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 1
        })),
        deleteSession: vi.fn(async () => 2)
      };

      authService = new AuthService(mockSessionRepo, mockDeviceRepo, mockUserRepo);
    });

    // --- AUTH SERVICE ---
    it('AuthService.signJwt centralizes JWT payload construction', () => {
      const mockSignFn = vi.fn().mockReturnValue('mock-jwt-token-abc');

      const token = authService.signJwt(
        { id: 'u1', email: 'test@betrix.io', isAdmin: false },
        { token: 'session-tok-123' },
        mockSignFn
      );

      expect(token).toBe('mock-jwt-token-abc');
      expect(mockSignFn).toHaveBeenCalledWith({
        userId: 'u1',
        sessionId: 'session-tok-123',
        email: 'test@betrix.io',
        isAdmin: false
      });
    });

    it('AuthService.signJwt includes isAdmin flag for admin users', () => {
      const mockSignFn = vi.fn().mockReturnValue('admin-jwt-token');

      authService.signJwt(
        { id: 'admin-1', email: 'admin@betrix.io', isAdmin: true },
        { token: 'admin-session-tok' },
        mockSignFn
      );

      expect(mockSignFn).toHaveBeenCalledWith(expect.objectContaining({ isAdmin: true }));
    });

    // --- IDENTITY ---
    it('RegisterUseCase registers new user and creates session', async () => {
      const registerUseCase = new RegisterUseCase(
        mockUserRepo,
        mockDeviceRepo,
        mockVerificationRepo,
        authService,
        undefined,
        100,
        true // isDevMode
      );

      const result = await registerUseCase.execute({
        email: 'newuser@betrix.io',
        password: 'Password123!',
        name: 'New Trader',
        deviceFingerprint: 'dev_fp_9999'
      });

      expect(result.user.email).toBe('newuser@betrix.io');
      expect(result.user.credits).toBe(100);
      expect(result.session).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.verificationToken).toBeDefined();
    });

    it('RedeemVoucherUseCase redeems voucher and increases credit balance (ADR-29)', async () => {
      const voucher = new CreditVoucher({
        id: 'vouch-1',
        code: 'PRO200',
        amount: 200,
        isRedeemed: false,
        createdAt: new Date()
      });
      mockVouchersDb.set(voucher.code, voucher);

      const redeemUseCase = new RedeemVoucherUseCase(mockVoucherRepo, mockCreditRepo);
      const result = await redeemUseCase.execute('usr-1', { code: 'PRO200' });

      expect(result.success).toBe(true);
      expect(result.amount).toBe(200);
      expect(result.newBalance).toBe(300); // 100 initial + 200 voucher

      // Check that voucher cannot be redeemed twice
      await expect(redeemUseCase.execute('usr-1', { code: 'PRO200' })).rejects.toThrow(
        'already been redeemed'
      );
    });

    it('GetStreamTicketUseCase issues one-time ticket (ADR-18)', async () => {
      const ticketStore = new InMemoryTicketStore();
      const ticketUseCase = new GetStreamTicketUseCase(ticketStore as any);

      const ticketResult = await ticketUseCase.execute('usr-1', 60);
      expect(ticketResult.ticket).toBeDefined();
      expect(ticketResult.expiresInSeconds).toBe(60);

      const resolvedUser = await ticketStore.getAndDelete(ticketResult.ticket);
      expect(resolvedUser).toBe('usr-1');
    });

    // --- INTELLIGENCE ---
    it('SendMessageUseCase executes AI completion and deducts dynamic credits (ADR-21)', async () => {
      const mockAiGateway = {
        complete: vi.fn().mockResolvedValue({
          reply: 'EURUSD is in a strong uptrend above 1.0820 support.',
          thinking: 'Analyzing EMA20 and swing fractals...',
          inputTokens: 120,
          outputTokens: 80,
          latencyMs: 340
        })
      };

      const mockContextInjectionService = {
        buildMarketContext: vi.fn().mockResolvedValue({
          contextBlock: 'EURUSD Context',
          metadata: { symbol: 'EURUSD' }
        })
      };

      const sendUseCase = new SendMessageUseCase(
        mockChatRepo,
        mockCreditRepo,
        mockAiGateway as any,
        mockContextInjectionService as any
      );

      const result = await sendUseCase.execute('usr-1', {
        message: 'What is the EURUSD bias?',
        model: 'gpt-4o-mini',
        taskType: 'market_analysis'
      });

      expect(result.reply).toContain('EURUSD is in a strong uptrend');
      expect(result.thinking).toContain('Analyzing EMA20');
      expect(result.creditsSpent).toBe(1); // (120+80)/1000 * 1 = 0.2 -> ceil to 1
      expect(result.remainingCredits).toBe(99); // 100 - 1
      expect(mockChatRepo.save).toHaveBeenCalled();
    });

    it('StreamMessageUseCase streams chunks and triggers ChatLoggingHandler event', async () => {
      const dispatcher = new EventDispatcher();
      dispatcher.clear();

      const chatLoggingHandler = new ChatLoggingHandler(mockChatRepo, mockCreditRepo);
      chatLoggingHandler.register(dispatcher);

      const mockAiGateway = {
        stream: vi.fn(async (req, callbacks) => {
          callbacks.onThink?.('Thinking about structure...');
          callbacks.onDelta?.('Market ');
          callbacks.onDelta?.('is Bullish.');
          callbacks.onDone?.({ inputTokens: 50, outputTokens: 50, latencyMs: 250 });
        })
      };

      const mockContextInjectionService = {
        buildMarketContext: vi.fn().mockResolvedValue({ contextBlock: '', metadata: {} })
      };

      const streamUseCase = new StreamMessageUseCase(
        mockChatRepo,
        mockCreditRepo,
        mockAiGateway as any,
        mockContextInjectionService as any,
        dispatcher
      );

      const deltas: string[] = [];
      const thinks: string[] = [];
      let doneMeta: any = null;

      await streamUseCase.execute(
        'usr-1',
        { message: 'Is gold bullish?', model: 'deepseek-reasoner' },
        {
          onThink: (c) => thinks.push(c),
          onDelta: (c) => deltas.push(c),
          onDone: (meta) => {
            doneMeta = meta;
          }
        }
      );

      expect(thinks).toEqual(['Thinking about structure...']);
      expect(deltas.join('')).toBe('Market is Bullish.');
      expect(doneMeta).toBeDefined();
      expect(doneMeta.creditsSpent).toBe(1);

      // Credits are settled exactly once, via settleReservation from the use case
      // itself (reserve -> settle with actual cost). The event handler must NOT
      // also call deductCredits, or the user would be charged twice for one message.
      expect(mockCreditRepo.settleReservation).toHaveBeenCalledWith(
        'usr-1',
        expect.any(Number),
        1,
        expect.stringContaining('AI_CHAT:')
      );
      expect(mockCreditRepo.deductCredits).not.toHaveBeenCalled();
      expect(mockChatRepo.save).toHaveBeenCalled();
    });

    // --- MARKET ---
    it('GetPricesUseCase returns all prices enriched with 24h change', async () => {
      const mockMarketDataService = {
        getAllPrices: vi.fn().mockResolvedValue([
          new PriceTick({
            symbol: 'EURUSD',
            bid: 1.085,
            ask: 1.0852,
            spread: 2,
            volume: 100,
            timestamp: 1700000000
          })
        ]),
        getPrice: vi.fn().mockResolvedValue(null),
        getOHLC: vi.fn().mockResolvedValue([
          new OHLCBar({
            time: 1000,
            open: 1.08,
            high: 1.086,
            low: 1.079,
            close: 1.084,
            volume: 200
          })
        ]),
        calculate24hChange: vi.fn().mockReturnValue({ changeAmount: 0.0051, changePercent: 0.47 })
      };

      const getPricesUseCase = new GetPricesUseCase(mockMarketDataService as any);

      const prices = (await getPricesUseCase.execute()) as any[];
      expect(prices).toHaveLength(1);
      expect(prices[0].symbol).toBe('EURUSD');
      expect(prices[0].change24hPercent).toBe(0.47);
    });

    it('GetPricesUseCase.execute(symbol) returns single price with on-demand fallback', async () => {
      const mockMarketDataService = {
        getPrice: vi.fn().mockResolvedValue(null), // cache miss
        getAllPrices: vi.fn(),
        getOHLC: vi.fn().mockResolvedValue([
          new OHLCBar({
            time: 1000,
            open: 1.08,
            high: 1.086,
            low: 1.079,
            close: 1.084,
            volume: 200
          })
        ]),
        calculate24hChange: vi.fn().mockReturnValue({ changeAmount: 0.004, changePercent: 0.37 })
      };

      const getPricesUseCase = new GetPricesUseCase(mockMarketDataService as any);
      const result = (await getPricesUseCase.execute('EURUSD')) as any;

      // Falls back to getOHLC for live tick + d1 baseline
      expect(result.symbol).toBe('EURUSD');
      expect(mockMarketDataService.getOHLC).toHaveBeenCalled();
      expect(result.change24hPercent).toBe(0.37);
    });

    it('GetPricesUseCase.execute(symbol) returns zero-price fallback when no data available', async () => {
      const mockMarketDataService = {
        getPrice: vi.fn().mockResolvedValue(null),
        getAllPrices: vi.fn(),
        getOHLC: vi.fn().mockResolvedValue([]), // empty response
        calculate24hChange: vi.fn().mockReturnValue({ changeAmount: 0, changePercent: 0 })
      };

      const getPricesUseCase = new GetPricesUseCase(mockMarketDataService as any);
      const result = (await getPricesUseCase.execute('UNKNOWN')) as any;

      expect(result.symbol).toBe('UNKNOWN');
      expect(result.bid).toBe(0);
      expect(result.ask).toBe(0);
      expect(result.last).toBe(0);
    });

    it('GetPricesUseCase.execute() returns empty array when no prices in cache', async () => {
      const mockMarketDataService = {
        getAllPrices: vi.fn().mockResolvedValue([]),
        getPrice: vi.fn(),
        getOHLC: vi.fn(),
        calculate24hChange: vi.fn()
      };

      const getPricesUseCase = new GetPricesUseCase(mockMarketDataService as any);
      const result = (await getPricesUseCase.execute()) as any[];
      expect(result).toHaveLength(0);
    });
    it('CreateVoucherUseCase creates a valid credit voucher (ADR-29)', async () => {
      const mockAdminActionRepo = {
        save: vi.fn().mockResolvedValue({})
      };

      const createVoucherUseCase = new CreateVoucherUseCase(
        mockVoucherRepo,
        mockAdminActionRepo as any
      );
      const created = await createVoucherUseCase.execute('admin-1', {
        code: 'SUMMER1000',
        amount: 1000
      });

      expect(created.code).toBe('SUMMER1000');
      expect(created.amount).toBe(1000);
      expect(mockAdminActionRepo.save).toHaveBeenCalled();
    });

    it('BroadcastMessageUseCase sends message to all active users', async () => {
      const mockMessageRepo = {
        save: vi.fn().mockResolvedValue({})
      };
      const mockAdminActionRepo = {
        save: vi.fn().mockResolvedValue({})
      };

      const broadcastUseCase = new BroadcastMessageUseCase(
        mockUserRepo,
        mockMessageRepo as any,
        mockAdminActionRepo as any
      );

      const result = await broadcastUseCase.execute('admin-1', {
        subject: 'Maintenance Notice',
        body: 'Scheduled maintenance this Sunday at 00:00 UTC.'
      });

      expect(result.success).toBe(true);
      expect(result.recipientsCount).toBe(1); // 1 active non-admin user
      expect(mockMessageRepo.save).toHaveBeenCalled();
    });

    it('CreateAgentUseCase, ListAgentsUseCase, and SetDefaultAgentUseCase manage dynamic database AI agents', async () => {
      const agents: any[] = [];
      const mockAgentRepo = {
        findById: vi
          .fn()
          .mockImplementation((id: string) => agents.find((a) => a.id === id) || null),
        findAll: vi.fn().mockImplementation((filter: any) => {
          const activeOnly = typeof filter === 'boolean' ? filter : (filter?.activeOnly ?? false);
          const visibility = typeof filter === 'object' ? filter?.visibility : undefined;
          return agents.filter((a) => {
            if (activeOnly && !a.isActive) return false;
            if (visibility && a.visibility !== visibility) return false;
            return true;
          });
        }),
        findDefault: vi.fn().mockImplementation(() => agents.find((a) => a.isDefault) || null),
        save: vi.fn().mockImplementation((agent: any) => {
          agents.push(agent);
          return Promise.resolve(agent);
        }),
        setDefault: vi.fn().mockImplementation((id: string) => {
          agents.forEach((a) => {
            a.isDefault = a.id === id;
          });
          return Promise.resolve(true);
        }),
        delete: vi.fn().mockResolvedValue(true)
      };

      const createAgent = new CreateAgentUseCase(mockAgentRepo as any);
      const created = await createAgent.execute({
        id: 'scalper-pro',
        name: 'Scalper Pro',
        modelName: 'dahono/deepseek-v4-pro-0813',
        taskType: 'trade_reasoning',
        creditsPer1kTokens: 2,
        isDefault: true,
        isActive: true,
        visibility: 'public'
      });

      expect(created.id).toBe('scalper-pro');
      expect(created.creditsPer1kTokens).toBe(2);
      expect(created.visibility).toBe('public');

      // Create a private internal QA agent
      await createAgent.execute({
        id: 'qa-experimental',
        name: 'QA Experimental Model',
        modelName: 'internal/exp-model',
        taskType: 'trade_reasoning',
        creditsPer1kTokens: 1,
        isDefault: false,
        isActive: true,
        visibility: 'private'
      });

      const listModels = new ListModelsUseCase(mockAgentRepo as any);
      const publicModels = await listModels.execute();
      // Public list should only have scalper-pro, not qa-experimental
      expect(publicModels.length).toBe(1);
      expect(publicModels[0].id).toBe('scalper-pro');

      const listAgents = new ListAgentsUseCase(mockAgentRepo as any);
      // Admin list (false) gets all agents (public + private)
      const allAgents = await listAgents.execute(false);
      expect(allAgents.length).toBe(2);
    });

    it('GetAdminUserChatHistoryUseCase retrieves user chat history and logs VIEW_USER_CHAT audit action', async () => {
      const mockAdminActionRepo = {
        save: vi.fn().mockResolvedValue({})
      };

      const chatHistoryUseCase = new GetAdminUserChatHistoryUseCase(
        mockUserRepo,
        mockChatRepo,
        mockAdminActionRepo as any
      );

      // 1. Success case without sessionId
      const result = await chatHistoryUseCase.execute('admin-1', 'usr-1', { page: 1, limit: 20 });
      expect(result).toBeDefined();
      expect(mockChatRepo.findByUserId).toHaveBeenCalledWith('usr-1', { page: 1, limit: 20 });
      expect(mockAdminActionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'VIEW_USER_CHAT',
          targetId: 'usr-1',
          adminId: 'admin-1'
        })
      );

      // 2. Success case with sessionId
      await chatHistoryUseCase.execute('admin-1', 'usr-1', { page: 1, limit: 20 }, 'sess-xyz');
      expect(mockChatRepo.findBySessionId).toHaveBeenCalledWith('sess-xyz', 'usr-1');

      // 3. Not found error for invalid user
      await expect(
        chatHistoryUseCase.execute('admin-1', 'nonexistent-user', { page: 1, limit: 20 })
      ).rejects.toThrow('User not found.');
    });

    it('TestAgentUseCase executes ephemeral QA test prompt without credit deduction or chat history persistence', async () => {
      const mockAgent = {
        id: 'test-qa-agent',
        name: 'QA Test Agent',
        modelName: 'deepseek-v4-pro',
        systemPrompt: 'Default system prompt',
        temperature: 70,
        maxTokens: 4096,
        baseUrl: null,
        apiKey: null
      };

      const mockAgentRepo = {
        findById: vi
          .fn()
          .mockImplementation((id: string) => (id === 'test-qa-agent' ? mockAgent : null))
      };

      const mockAiGateway = {
        complete: vi.fn().mockResolvedValue({
          reply: 'Analysis completed successfully with confluence on EURUSD.',
          thinking: 'Step 1: Check market structure. Step 2: Confluence confirmed.',
          inputTokens: 120,
          outputTokens: 85,
          latencyMs: 340
        })
      };

      const testAgentUseCase = new TestAgentUseCase(mockAgentRepo as any, mockAiGateway as any);

      const result = await testAgentUseCase.execute('test-qa-agent', {
        message: 'Analyze EURUSD D1 setup',
        temperatureOverride: 0.5,
        systemPromptOverride: 'Overridden custom instruction'
      });

      expect(result.agentId).toBe('test-qa-agent');
      expect(result.reply).toContain('Analysis completed successfully');
      expect(result.thinking).toContain('Step 1: Check market structure');
      expect(result.usage.totalTokens).toBe(205);
      expect(result.usage.latencyMs).toBe(340);

      expect(mockAiGateway.complete).toHaveBeenCalledWith({
        model: 'deepseek-v4-pro',
        messages: [
          { role: 'system', content: 'Overridden custom instruction' },
          { role: 'user', content: 'Analyze EURUSD D1 setup' }
        ],
        temperature: 0.5,
        maxTokens: 4096,
        baseUrl: undefined,
        apiKey: undefined
      });
    });

    it('CreateAdminUserUseCase and UpdateAdminUserUseCase handle commercial user tiers', async () => {
      let savedUser: any = null;
      const localMockUserRepo = {
        findByEmail: vi.fn().mockResolvedValue(null),
        findById: vi.fn().mockImplementation((id: string) => Promise.resolve(savedUser)),
        save: vi.fn().mockImplementation((u: any) => {
          savedUser = u;
          return Promise.resolve(u);
        }),
        update: vi.fn().mockImplementation((u: any) => {
          savedUser = u;
          return Promise.resolve(u);
        }),
        updateCredits: vi.fn().mockResolvedValue(true)
      };

      const localMockAdminActionRepo = {
        save: vi.fn().mockResolvedValue({})
      };

      const localMockAuthService = {
        hashPassword: vi.fn().mockResolvedValue('hashed_pwd')
      };

      const localMockSessionRepo = {
        deleteByUserId: vi.fn().mockResolvedValue(true)
      };

      const localMockCreditRepo = {
        addCredits: vi.fn().mockImplementation((_userId: string, amount: number) => Promise.resolve(amount)),
        deductCredits: vi.fn().mockImplementation((_userId: string, amount: number) => Promise.resolve(-amount))
      };

      // 1. Create Pro User
      const createUserUseCase = new CreateAdminUserUseCase(
        localMockUserRepo as any,
        localMockAdminActionRepo as any,
        localMockAuthService as any
      );

      const created = await createUserUseCase.execute('admin-1', {
        email: 'pro-trader@betrix.io',
        name: 'Pro Trader',
        tier: 'pro',
        credits: 5000
      });

      expect(created.user.tier).toBe('pro');
      expect(created.user.credits).toBe(5000);
      expect(localMockUserRepo.save).toHaveBeenCalled();

      // 2. Update to VIP Tier
      const updateUserUseCase = new UpdateAdminUserUseCase(
        localMockUserRepo as any,
        localMockAdminActionRepo as any,
        localMockSessionRepo as any,
        localMockCreditRepo as any
      );

      const updated = await updateUserUseCase.execute('admin-1', created.user.id, {
        tier: 'vip'
      });

      expect(updated.tier).toBe('vip');
      expect(localMockUserRepo.update).toHaveBeenCalled();

      // 2.5 Credit delta reconciliation (Bug #2): admin sets an absolute target
      // balance; the use case must apply the DIFFERENCE via add/deduct, never
      // overwrite. Starting balance 100 -> target 500 => +400.
      const creditUser = {
        id: 'credit-user',
        email: 'credit@betrix.io',
        name: 'Credit User',
        isAdmin: false,
        status: 'active',
        tier: 'pro',
        credits: 100
      };
      localMockUserRepo.findById = vi.fn().mockResolvedValue(creditUser);
      localMockCreditRepo.addCredits.mockClear();
      localMockCreditRepo.deductCredits.mockClear();

      const creditUpdated = await updateUserUseCase.execute('admin-1', 'credit-user', {
        credits: 500
      });

      expect(localMockCreditRepo.addCredits).toHaveBeenCalledWith(
        'credit-user',
        400,
        expect.stringContaining('ADMIN_ADJUSTMENT')
      );
      expect(localMockCreditRepo.deductCredits).not.toHaveBeenCalled();
      expect(creditUpdated.credits).toBe(400);

      // Target below current balance => deduct the difference (500 -> 250 => -250).
      localMockUserRepo.findById = vi.fn().mockResolvedValue({ ...creditUser, credits: 500 });
      localMockCreditRepo.addCredits.mockClear();
      localMockCreditRepo.deductCredits.mockClear();

      const creditDown = await updateUserUseCase.execute('admin-1', 'credit-user', {
        credits: 250
      });

      expect(localMockCreditRepo.deductCredits).toHaveBeenCalledWith(
        'credit-user',
        250,
        expect.stringContaining('ADMIN_ADJUSTMENT')
      );
      expect(localMockCreditRepo.addCredits).not.toHaveBeenCalled();
      expect(creditDown.credits).toBe(-250);

      // 3. Security Guard: Self-Demotion
      const selfAdmin = {
        id: 'admin-1',
        email: 'root@betrix.io',
        name: 'Root Admin',
        isAdmin: true,
        status: 'active',
        tier: 'vip',
        credits: 100000
      };
      localMockUserRepo.findById = vi.fn().mockResolvedValue(selfAdmin);

      await expect(
        updateUserUseCase.execute('admin-1', 'admin-1', { isAdmin: false })
      ).rejects.toThrow('SELF_DEMOTION_FORBIDDEN');

      // 4. Security Guard: Self-Suspension & Self-Ban
      await expect(
        updateUserUseCase.execute('admin-1', 'admin-1', { status: 'suspended' })
      ).rejects.toThrow('SELF_LOCKOUT_FORBIDDEN');

      await expect(
        updateUserUseCase.execute('admin-1', 'admin-1', { status: 'banned' })
      ).rejects.toThrow('SELF_LOCKOUT_FORBIDDEN');

      // 5. Security Guard: Self-Deletion and Admin Deletion
      const deleteUserUseCase = new DeleteAdminUserUseCase(
        localMockUserRepo as any,
        localMockAdminActionRepo as any
      );

      await expect(deleteUserUseCase.execute('admin-1', 'admin-1')).rejects.toThrow(
        'SELF_DELETION_FORBIDDEN'
      );

      const otherAdmin = {
        id: 'admin-2',
        email: 'admin2@betrix.io',
        name: 'Admin 2',
        isAdmin: true,
        status: 'active'
      };
      localMockUserRepo.findById = vi.fn().mockResolvedValue(otherAdmin);

      await expect(deleteUserUseCase.execute('admin-1', 'admin-2')).rejects.toThrow(
        'ADMIN_DELETION_FORBIDDEN'
      );
    });
  });
});
