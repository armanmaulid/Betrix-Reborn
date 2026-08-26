import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { env } from '@betrix/config';
import {
  createPgPool,
  createDrizzleClient,
  createRedisClient,
  RedisCaptchaStore,
  RedisStreamTicketStore,
  RedisMarketCacheStore,
  CachedMarketDataProvider,
  DrizzleUserRepository,
  DrizzleSessionRepository,
  DrizzleDeviceRepository,
  DrizzleChatRepository,
  DrizzleCreditRepository,
  DrizzleSymbolRepository,
  DrizzleStreamSymbolRepository,
  DrizzleOhlcSymbolRepository,
  DrizzleNewsRepository,
  DrizzleMessageRepository,
  DrizzleAdminActionRepository,
  DrizzleActivityLogRepository,
  DrizzleAnalyticsRepository,
  DrizzleUsageRepository,
  DrizzleVerificationRepository,
  DrizzleLoginAttemptRepository,
  DrizzleVoucherRepository,
  DrizzleAiAgentRepository,
  DrizzleWorkerStateRepository,
  RedisWorkerCommandBus,
  redisKeys,
  DrizzleCalendarRepository,
  DukascopyHistoryClient,
  FinnhubNewsAdapter,
  AiGatewayClient,
  SmtpEmailService,
  DrizzleDb
} from '@betrix/infra';
import {
  AppConfig,
  createAppConfig,
  AuthService,
  CaptchaService,
  MarketDataService,
  NewsService,
  ContextInjectionService,
  WorkerManagerService,
  IWorkerCommandPublisher,
  RegisterUseCase,
  LoginUseCase,
  GoogleOAuthUseCase,
  GoogleVerifierNotConfiguredError,
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
  RedeemVoucherUseCase,
  SendMessageUseCase,
  StreamMessageUseCase,
  GetChatHistoryUseCase,
  DeleteChatSessionUseCase,
  ExportChatUseCase,
  ListModelsUseCase,
  ListAgentsUseCase,
  GetAgentUseCase,
  CreateAgentUseCase,
  UpdateAgentUseCase,
  DeleteAgentUseCase,
  SetDefaultAgentUseCase,
  TestAgentUseCase,
  GetSymbolsUseCase,
  GetPricesUseCase,
  GetOHLCUseCase,
  FetchNewsUseCase,
  StoreNewsUseCase,
  GetNewsUseCase,
  GetCalendarUseCase,
  GetInboxUseCase,
  GetSentMessagesUseCase,
  GetThreadUseCase,
  SendUserMessageUseCase,
  MarkMessageReadUseCase,
  DeleteMessageUseCase,
  UpdateNotificationPrefsUseCase,
  GetAdminUsersUseCase,
  GetAdminUserDetailUseCase,
  UpdateAdminUserUseCase,
  CreateAdminUserUseCase,
  DeleteAdminUserUseCase,
  ResetUserPasswordUseCase,
  CreateVoucherUseCase,
  ListVouchersUseCase,
  RevokeVoucherUseCase,
  BatchRevokeVouchersUseCase,
  GetSystemMetricsUseCase,
  GetAnalyticsUseCase,
  GetAuditLogsUseCase,
  ExportAuditLogsUseCase,
  BroadcastMessageUseCase,
  SystemCleanupUseCase,
  GetAdminUserChatHistoryUseCase,
  ListWorkersUseCase,
  ControlWorkerUseCase,
  SaveSymbolUseCase,
  DeleteSymbolUseCase,
  GetStreamSymbolsUseCase,
  SaveStreamSymbolUseCase,
  DeleteStreamSymbolUseCase,
  DeleteNewsUseCase,
  BatchDeleteNewsUseCase,
  GetOhlcSymbolsUseCase,
  SaveOhlcSymbolUseCase,
  DeleteOhlcSymbolUseCase,
  RevokeUserSessionUseCase,
  RevokeAllUserSessionsUseCase,
  RemoveUserDeviceUseCase,
  ChatLoggingHandler
} from '@betrix/application';

import { EventDispatcher, INotifier } from '@betrix/domain';

export interface AppContainer {
  config: AppConfig;
  pgPool: any;
  db: DrizzleDb;
  redis: any;
  stores: {
    captchaStore: RedisCaptchaStore;
    ticketStore: RedisStreamTicketStore;
  };
  repositories: {
    userRepo: DrizzleUserRepository;
    sessionRepo: DrizzleSessionRepository;
    deviceRepo: DrizzleDeviceRepository;
    chatRepo: DrizzleChatRepository;
    creditRepo: DrizzleCreditRepository;
    symbolRepo: DrizzleSymbolRepository;
    streamSymbolRepo: DrizzleStreamSymbolRepository;
    ohlcSymbolRepo: DrizzleOhlcSymbolRepository;
    newsRepo: DrizzleNewsRepository;
    messageRepo: DrizzleMessageRepository;
    adminActionRepo: DrizzleAdminActionRepository;
    activityLogRepo: DrizzleActivityLogRepository;
    analyticsRepo: DrizzleAnalyticsRepository;
    usageRepo: DrizzleUsageRepository;
    verificationRepo: DrizzleVerificationRepository;
    loginAttemptRepo: DrizzleLoginAttemptRepository;
    voucherRepo: DrizzleVoucherRepository;
    agentRepo: DrizzleAiAgentRepository;
    marketDataRepo: RedisMarketCacheStore;
  };
  adapters: {
    historicalProvider: CachedMarketDataProvider;
    newsProvider: FinnhubNewsAdapter;
    aiGateway: AiGatewayClient;
    emailService: SmtpEmailService;
  };
  services: {
    authService: AuthService;
    captchaService: CaptchaService;
    marketDataService: MarketDataService;
    newsService: NewsService;
    contextInjectionService: ContextInjectionService;
    workerManagerService: WorkerManagerService;
  };
  useCases: {
    // Identity
    registerUseCase: RegisterUseCase;
    loginUseCase: LoginUseCase;
    googleOAuthUseCase: GoogleOAuthUseCase;
    verifyEmailUseCase: VerifyEmailUseCase;
    resendVerificationUseCase: ResendVerificationUseCase;
    forgotPasswordUseCase: ForgotPasswordUseCase;
    resetPasswordUseCase: ResetPasswordUseCase;
    changePasswordUseCase: ChangePasswordUseCase;
    changeEmailUseCase: ChangeEmailUseCase;
    getStreamTicketUseCase: GetStreamTicketUseCase;
    revokeSessionUseCase: RevokeSessionUseCase;
    logoutAllUseCase: LogoutAllUseCase;
    getProfileUseCase: GetProfileUseCase;
    updateProfileUseCase: UpdateProfileUseCase;
    redeemVoucherUseCase: RedeemVoucherUseCase;

    // Intelligence
    sendMessageUseCase: SendMessageUseCase;
    streamMessageUseCase: StreamMessageUseCase;
    getChatHistoryUseCase: GetChatHistoryUseCase;
    deleteChatSessionUseCase: DeleteChatSessionUseCase;
    exportChatUseCase: ExportChatUseCase;
    listModelsUseCase: ListModelsUseCase;
    listAgentsUseCase: ListAgentsUseCase;
    getAgentUseCase: GetAgentUseCase;
    createAgentUseCase: CreateAgentUseCase;
    updateAgentUseCase: UpdateAgentUseCase;
    deleteAgentUseCase: DeleteAgentUseCase;
    setDefaultAgentUseCase: SetDefaultAgentUseCase;
    testAgentUseCase: TestAgentUseCase;

    // Market
    getSymbolsUseCase: GetSymbolsUseCase;
    getPricesUseCase: GetPricesUseCase;
    getOHLCUseCase: GetOHLCUseCase;

    // News
    fetchNewsUseCase: FetchNewsUseCase;
    storeNewsUseCase: StoreNewsUseCase;
    getNewsUseCase: GetNewsUseCase;
    getCalendarUseCase: GetCalendarUseCase;

    // Messaging
    getInboxUseCase: GetInboxUseCase;
    getSentMessagesUseCase: GetSentMessagesUseCase;
    getThreadUseCase: GetThreadUseCase;
    sendUserMessageUseCase: SendUserMessageUseCase;
    markMessageReadUseCase: MarkMessageReadUseCase;
    deleteMessageUseCase: DeleteMessageUseCase;
    updateNotificationPrefsUseCase: UpdateNotificationPrefsUseCase;

    // Admin
    getAdminUsersUseCase: GetAdminUsersUseCase;
    getAdminUserDetailUseCase: GetAdminUserDetailUseCase;
    updateAdminUserUseCase: UpdateAdminUserUseCase;
    createAdminUserUseCase: CreateAdminUserUseCase;
    deleteAdminUserUseCase: DeleteAdminUserUseCase;
    resetUserPasswordUseCase: ResetUserPasswordUseCase;
    createVoucherUseCase: CreateVoucherUseCase;
    listVouchersUseCase: ListVouchersUseCase;
    revokeVoucherUseCase: RevokeVoucherUseCase;
    batchRevokeVouchersUseCase: BatchRevokeVouchersUseCase;
    getSystemMetricsUseCase: GetSystemMetricsUseCase;
    getAnalyticsUseCase: GetAnalyticsUseCase;
    getAuditLogsUseCase: GetAuditLogsUseCase;
    exportAuditLogsUseCase: ExportAuditLogsUseCase;
    broadcastMessageUseCase: BroadcastMessageUseCase;
    systemCleanupUseCase: SystemCleanupUseCase;
    getAdminUserChatHistoryUseCase: GetAdminUserChatHistoryUseCase;
    listWorkersUseCase: ListWorkersUseCase;
    controlWorkerUseCase: ControlWorkerUseCase;
    saveSymbolUseCase: SaveSymbolUseCase;
    deleteSymbolUseCase: DeleteSymbolUseCase;
    getStreamSymbolsUseCase: GetStreamSymbolsUseCase;
    saveStreamSymbolUseCase: SaveStreamSymbolUseCase;
    deleteStreamSymbolUseCase: DeleteStreamSymbolUseCase;
    revokeUserSessionUseCase: RevokeUserSessionUseCase;
    revokeAllUserSessionsUseCase: RevokeAllUserSessionsUseCase;
    removeUserDeviceUseCase: RemoveUserDeviceUseCase;
    getOhlcSymbolsUseCase: GetOhlcSymbolsUseCase;
    saveOhlcSymbolUseCase: SaveOhlcSymbolUseCase;
    deleteOhlcSymbolUseCase: DeleteOhlcSymbolUseCase;
    deleteNewsUseCase: DeleteNewsUseCase;
    batchDeleteNewsUseCase: BatchDeleteNewsUseCase;
  };

  eventDispatcher: EventDispatcher;
}

declare module 'fastify' {
  interface FastifyInstance {
    container: AppContainer;
  }
}

const containerPluginCallback: FastifyPluginAsync = async (fastify) => {
  // 0. Application Config (single composition root boundary — never imported by use cases)
  const appConfig = createAppConfig(env);

  // 1. Initialize DB & Cache
  const pgPool = createPgPool(env.DATABASE_URL, 20);
  const db = createDrizzleClient(pgPool);
  // T5.1 — dedicated money pool: isolates financial transactions from app
  // traffic. Falls back to the same URL in dev/single-pool mode.
  const moneyPool = env.DATABASE_URL_MONEY
    ? createPgPool(env.DATABASE_URL_MONEY, 6)
    : null;
  const moneyDb = moneyPool ? createDrizzleClient(moneyPool) : db;
  const redis = createRedisClient(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);

  // 2. Stores & Repositories
  const captchaStore = new RedisCaptchaStore(redis);
  const ticketStore = new RedisStreamTicketStore(redis);
  const marketDataRepo = new RedisMarketCacheStore(redis);

  const userRepo = new DrizzleUserRepository(db);
  const sessionRepo = new DrizzleSessionRepository(db);
  const deviceRepo = new DrizzleDeviceRepository(db);
  const chatRepo = new DrizzleChatRepository(db);
  const creditRepo = new DrizzleCreditRepository(moneyDb);
  const symbolRepo = new DrizzleSymbolRepository(db, redis);
  const streamSymbolRepo = new DrizzleStreamSymbolRepository(db);
  const ohlcSymbolRepo = new DrizzleOhlcSymbolRepository(db);
  const newsRepo = new DrizzleNewsRepository(db, redis);
  const messageRepo = new DrizzleMessageRepository(db);
  const adminActionRepo = new DrizzleAdminActionRepository(db);
  const activityLogRepo = new DrizzleActivityLogRepository(db);
  const analyticsRepo = new DrizzleAnalyticsRepository(db, redis, pgPool);
  const usageRepo = new DrizzleUsageRepository(db);
  const verificationRepo = new DrizzleVerificationRepository(db);
  const loginAttemptRepo = new DrizzleLoginAttemptRepository(db);
  const voucherRepo = new DrizzleVoucherRepository(moneyDb);
  const agentRepo = new DrizzleAiAgentRepository(db);

  // 3. Adapters
  const dukascopyProvider = new DukascopyHistoryClient();
  const historicalProvider = new CachedMarketDataProvider(dukascopyProvider, marketDataRepo);
  const newsProvider = new FinnhubNewsAdapter(env.FINNHUB_API_KEY || 'sandbox', 10);
  const aiGateway = new AiGatewayClient(
    env.AI_BASE_URL || 'http://localhost:20128/v1',
    env.AI_API_KEY || 'dev_key'
  );
  const emailService = new SmtpEmailService({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER || 'dev@betrix.io',
    pass: env.SMTP_PASS || 'devpass',
    from: env.SMTP_FROM
  });

  // Mock / In-Memory Notifier for SSE PubSub
  const notifier: INotifier = {
    broadcastGlobal: (channel: 'market' | 'news', event: string, payload: unknown) => {
      if (channel === 'market') {
        fastify.sseHub.broadcastMarketTick(payload);
      } else if (channel === 'news') {
        fastify.sseHub.broadcastNews(payload);
      }
    },
    broadcastToUser: (userId: string, event: string, payload: unknown) => {
      fastify.sseHub.broadcastToUser(userId, event, payload);
    }
  };

  // Relay freshly-ingested news rows to browser SSE subscribers
  // ('stream/news'). Reads OUR OWN database every 15s and broadcasts only
  // never-seen ids, so the worker stays the single Finnhub consumer while the
  // API process owns all browser connections.
  const seenNewsIds = new Set<string>();
  let seenNewsPrimed = false;
  const newsRelayTimer = setInterval(async () => {
    if (!fastify.sseHub.hasClientsFor('news')) return;

    try {
      const latest = await newsRepo.findRecent(25);

      // First pass after boot primes the seen-set so historical rows are not
      // blasted as "breaking news" to whoever connects later.
      if (!seenNewsPrimed) {
        for (const article of latest) seenNewsIds.add(article.id);
        seenNewsPrimed = true;
        return;
      }

      const fresh = latest.filter((article) => !seenNewsIds.has(article.id));
      for (const article of fresh.reverse()) {
        seenNewsIds.add(article.id);
        fastify.sseHub.broadcastNews(article.toJSON ? article.toJSON() : article);
      }
    } catch {
      // DB hiccup — next tick retries silently.
    }
  }, 15_000);

  fastify.addHook('onClose', async () => {
    clearInterval(newsRelayTimer);
  });

  // 4. Application Services
  const authService = new AuthService(sessionRepo, deviceRepo, userRepo);
  const captchaService = new CaptchaService(captchaStore);
  const marketDataService = new MarketDataService(symbolRepo, marketDataRepo, historicalProvider);
  const newsService = new NewsService(newsRepo, newsProvider);
  const contextInjectionService = new ContextInjectionService(marketDataService, newsService);

  // SSOT wiring: worker_states in Postgres is what apps/worker reads on boot,
  // Redis pub/sub is only the real-time transport to a currently-live process.
  const workerStateRepo = new DrizzleWorkerStateRepository(db);
  const workerCommandBus = new RedisWorkerCommandBus(redis);
  const workerCommandPublisher: IWorkerCommandPublisher = {
    async publishCommand(workerId, action, adminId) {
      await workerCommandBus.publishCommand(workerId, { action, adminId, timestamp: Date.now() });
    }
  };
  const workerManagerService = new WorkerManagerService(
    undefined,
    workerStateRepo,
    workerCommandPublisher
  );

  // Wire active Redis market price fetcher into SseHub
  if (fastify.sseHub && env.NODE_ENV !== 'test' && !process.env.VITEST) {
    fastify.sseHub.setPriceFetcher(async () => {
      return marketDataRepo.getAllPrices();
    });
  }

  // 5. Event Dispatcher & Handlers
  const eventDispatcher = new EventDispatcher((eventName, err) => {
    fastify.log.error({ err, eventName }, 'Event handler failed');
  });
  const chatLoggingHandler = new ChatLoggingHandler(
    chatRepo,
    creditRepo,
    activityLogRepo,
    fastify.log.child({ handler: 'ChatLoggingHandler' })
  );
  chatLoggingHandler.register(eventDispatcher);

  // T3.1 — Ops Aggregator: every 60s (only while an admin dashboard has an
  // open 'ops' SSE stream), the leader-replica computes metrics+analytics and
  // writes them to Redis gauges. Dashboards then read Redis — chat_messages
  // is never scanned by request traffic.
  if (env.NODE_ENV !== 'test' && !process.env.VITEST) {
    const aggMs = env.OPS_AGGREGATOR_INTERVAL_MS || 60_000;
    const aggTimer = setInterval(async () => {
      try {
        if (!fastify.sseHub?.hasClientsFor('ops')) return;
        const lockKey = redisKeys.opsLock('metrics');
        const got = await redis.set(lockKey, String(Date.now()), {
          nx: true,
          px: Math.ceil(aggMs * 0.9)
        });
        if (got !== 'OK') return; // another replica is aggregating

        const m = await getSystemMetricsUseCase.execute();
        await analyticsRepo.writeGauges(m);
        const a = await getAnalyticsUseCase.execute();
        await analyticsRepo.writeAnalyticsCache(a);
      } catch (err: any) {
        fastify.log.warn({ err: err.message }, '[OPS AGGREGATOR] snapshot failed');
      }
    }, aggMs);
    fastify.addHook('onClose', async () => clearInterval(aggTimer));
  }

  // 6. Use Cases
  const isDevMode = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';

  const mockGoogleVerifier = {
    verifyIdToken: async (token: string) => {
      // mock_ tokens accepted only in dev/test; never derive identity from arbitrary input
      if (isDevMode && token.startsWith('mock_')) {
        return {
          sub: 'google_sub_' + token,
          email: `${token.slice(5)}@mock.google`,
          name: 'Google Trader (Mock)',
          email_verified: true
        };
      }
      throw new GoogleVerifierNotConfiguredError();
    }
  };

  const registerUseCase = new RegisterUseCase(
    userRepo,
    deviceRepo,
    verificationRepo,
    authService,
    emailService,
    100,
    isDevMode,
    env.DEVICE_ENFORCEMENT,
    activityLogRepo
  );
  const loginUseCase = new LoginUseCase(
    userRepo,
    deviceRepo,
    loginAttemptRepo,
    authService,
    captchaService,
    env.DEVICE_ENFORCEMENT,
    activityLogRepo
  );
  const googleOAuthUseCase = new GoogleOAuthUseCase(
    userRepo,
    deviceRepo,
    authService,
    mockGoogleVerifier,
    100,
    env.DEVICE_ENFORCEMENT
  );
  const verifyEmailUseCase = new VerifyEmailUseCase(userRepo, verificationRepo);
  const resendVerificationUseCase = new ResendVerificationUseCase(
    userRepo,
    verificationRepo,
    emailService,
    isDevMode
  );
  const forgotPasswordUseCase = new ForgotPasswordUseCase(
    userRepo,
    verificationRepo,
    emailService,
    isDevMode
  );
  const resetPasswordUseCase = new ResetPasswordUseCase(
    userRepo,
    verificationRepo,
    sessionRepo,
    authService
  );
  const changePasswordUseCase = new ChangePasswordUseCase(userRepo, sessionRepo, authService);
  const changeEmailUseCase = new ChangeEmailUseCase(userRepo, authService);
  const getStreamTicketUseCase = new GetStreamTicketUseCase(ticketStore);
  const revokeSessionUseCase = new RevokeSessionUseCase(sessionRepo, activityLogRepo);
  const logoutAllUseCase = new LogoutAllUseCase(sessionRepo, activityLogRepo);
  const getProfileUseCase = new GetProfileUseCase(userRepo);
  const updateProfileUseCase = new UpdateProfileUseCase(userRepo);
  const redeemVoucherUseCase = new RedeemVoucherUseCase(voucherRepo, creditRepo);

  const sendMessageUseCase = new SendMessageUseCase(
    chatRepo,
    creditRepo,
    aiGateway,
    contextInjectionService,
    agentRepo,
    appConfig.defaultModel
  );
  const streamMessageUseCase = new StreamMessageUseCase(
    chatRepo,
    creditRepo,
    aiGateway,
    contextInjectionService,
    eventDispatcher,
    agentRepo,
    appConfig.defaultModel
  );
  const getChatHistoryUseCase = new GetChatHistoryUseCase(chatRepo);
  const deleteChatSessionUseCase = new DeleteChatSessionUseCase(chatRepo);
  const exportChatUseCase = new ExportChatUseCase(chatRepo);
  const listModelsUseCase = new ListModelsUseCase(agentRepo, appConfig.defaultModel);
  const listAgentsUseCase = new ListAgentsUseCase(agentRepo);
  const getAgentUseCase = new GetAgentUseCase(agentRepo);
  const createAgentUseCase = new CreateAgentUseCase(agentRepo, adminActionRepo);
  const updateAgentUseCase = new UpdateAgentUseCase(agentRepo, adminActionRepo);
  const deleteAgentUseCase = new DeleteAgentUseCase(agentRepo, adminActionRepo);
  const setDefaultAgentUseCase = new SetDefaultAgentUseCase(agentRepo, adminActionRepo);
  const testAgentUseCase = new TestAgentUseCase(agentRepo, aiGateway);

  const getSymbolsUseCase = new GetSymbolsUseCase(marketDataService);
  const getPricesUseCase = new GetPricesUseCase(marketDataService);
  const getOHLCUseCase = new GetOHLCUseCase(marketDataService);

  const fetchNewsUseCase = new FetchNewsUseCase(newsService, adminActionRepo);
  const storeNewsUseCase = new StoreNewsUseCase(newsRepo);
  const getNewsUseCase = new GetNewsUseCase(newsService);

  const calendarRepo = new DrizzleCalendarRepository(db, redis);
  const getCalendarUseCase = new GetCalendarUseCase(calendarRepo);

  const getInboxUseCase = new GetInboxUseCase(messageRepo);
  const getSentMessagesUseCase = new GetSentMessagesUseCase(messageRepo);
  const getThreadUseCase = new GetThreadUseCase(messageRepo);
  const sendUserMessageUseCase = new SendUserMessageUseCase(messageRepo, userRepo, notifier);
  const markMessageReadUseCase = new MarkMessageReadUseCase(messageRepo);
  const deleteMessageUseCase = new DeleteMessageUseCase(messageRepo);
  const updateNotificationPrefsUseCase = new UpdateNotificationPrefsUseCase(messageRepo);

  const getAdminUsersUseCase = new GetAdminUsersUseCase(userRepo);
  const getAdminUserDetailUseCase = new GetAdminUserDetailUseCase(
    userRepo,
    sessionRepo,
    deviceRepo,
    usageRepo,
    activityLogRepo
  );
  const updateAdminUserUseCase = new UpdateAdminUserUseCase(
    userRepo,
    adminActionRepo,
    sessionRepo,
    creditRepo,
    notifier
  );
  const createAdminUserUseCase = new CreateAdminUserUseCase(userRepo, adminActionRepo, authService);
  const deleteAdminUserUseCase = new DeleteAdminUserUseCase(userRepo, adminActionRepo);
  const resetUserPasswordUseCase = new ResetUserPasswordUseCase(
    userRepo,
    sessionRepo,
    adminActionRepo,
    authService
  );
  const createVoucherUseCase = new CreateVoucherUseCase(voucherRepo, adminActionRepo);
  const listVouchersUseCase = new ListVouchersUseCase(voucherRepo);
  const revokeVoucherUseCase = new RevokeVoucherUseCase(voucherRepo, adminActionRepo);
  const batchRevokeVouchersUseCase = new BatchRevokeVouchersUseCase(voucherRepo, adminActionRepo);
  const getSystemMetricsUseCase = new GetSystemMetricsUseCase(analyticsRepo);
  const getAnalyticsUseCase = new GetAnalyticsUseCase(analyticsRepo);

  // Wire dashboard ops snapshot pusher into SseHub. The fetcher only executes
  // while an admin dashboard is actively listening on the 'ops' channel.
  if (fastify.sseHub && env.NODE_ENV !== 'test' && !process.env.VITEST) {
    fastify.sseHub.setOpsFetcher(async () => {
      // T3.1 — OPS_SOURCE=cache (default) reads Redis gauges/analytics written
      // by the 60s aggregator; 'pg' forces live compute for parity checks.
      const source = env.OPS_SOURCE || 'cache';
      const metrics =
        source === 'cache'
          ? await analyticsRepo.getCachedSystemMetrics()
          : await getSystemMetricsUseCase.execute();
      const analytics =
        source === 'cache'
          ? await analyticsRepo.getUserAnalyticsCached()
          : await getAnalyticsUseCase.execute();
      return { metrics, analytics };
    });
  }
  const getAuditLogsUseCase = new GetAuditLogsUseCase(adminActionRepo, userRepo);
  const exportAuditLogsUseCase = new ExportAuditLogsUseCase(adminActionRepo);
  const broadcastMessageUseCase = new BroadcastMessageUseCase(
    userRepo,
    messageRepo,
    adminActionRepo,
    notifier
  );
  const systemCleanupUseCase = new SystemCleanupUseCase(
    sessionRepo,
    verificationRepo,
    loginAttemptRepo,
    adminActionRepo
  );
  const getAdminUserChatHistoryUseCase = new GetAdminUserChatHistoryUseCase(
    userRepo,
    chatRepo,
    adminActionRepo
  );
  const listWorkersUseCase = new ListWorkersUseCase(workerManagerService);
  const controlWorkerUseCase = new ControlWorkerUseCase(workerManagerService, adminActionRepo);
  const saveSymbolUseCase = new SaveSymbolUseCase(symbolRepo, adminActionRepo);
  const deleteSymbolUseCase = new DeleteSymbolUseCase(symbolRepo, adminActionRepo);
  const getStreamSymbolsUseCase = new GetStreamSymbolsUseCase(streamSymbolRepo);
  const saveStreamSymbolUseCase = new SaveStreamSymbolUseCase(streamSymbolRepo, adminActionRepo);
  const deleteStreamSymbolUseCase = new DeleteStreamSymbolUseCase(
    streamSymbolRepo,
    adminActionRepo
  );
  const getOhlcSymbolsUseCase = new GetOhlcSymbolsUseCase(ohlcSymbolRepo);
  const saveOhlcSymbolUseCase = new SaveOhlcSymbolUseCase(
    ohlcSymbolRepo,
    symbolRepo,
    adminActionRepo
  );
  const deleteOhlcSymbolUseCase = new DeleteOhlcSymbolUseCase(ohlcSymbolRepo, adminActionRepo);
  const deleteNewsUseCase = new DeleteNewsUseCase(newsRepo, adminActionRepo);
  const batchDeleteNewsUseCase = new BatchDeleteNewsUseCase(newsRepo, adminActionRepo);
  const revokeUserSessionUseCase = new RevokeUserSessionUseCase(sessionRepo, adminActionRepo);
  const revokeAllUserSessionsUseCase = new RevokeAllUserSessionsUseCase(
    sessionRepo,
    adminActionRepo
  );
  const removeUserDeviceUseCase = new RemoveUserDeviceUseCase(deviceRepo, adminActionRepo);

  const container: AppContainer = {
    config: appConfig,
    pgPool,
    db,
    redis,
    stores: {
      captchaStore,
      ticketStore
    },
    repositories: {
      userRepo,
      sessionRepo,
      deviceRepo,
      chatRepo,
      creditRepo,
      symbolRepo,
      streamSymbolRepo,
      ohlcSymbolRepo,
      newsRepo,
      messageRepo,
      adminActionRepo,
      activityLogRepo,
      analyticsRepo,
      usageRepo,
      verificationRepo,
      loginAttemptRepo,
      voucherRepo,
      agentRepo,
      marketDataRepo
    },
    adapters: {
      historicalProvider,
      newsProvider,
      aiGateway,
      emailService
    },
    services: {
      authService,
      captchaService,
      marketDataService,
      newsService,
      contextInjectionService,
      workerManagerService
    },
    useCases: {
      registerUseCase,
      loginUseCase,
      googleOAuthUseCase,
      verifyEmailUseCase,
      resendVerificationUseCase,
      forgotPasswordUseCase,
      resetPasswordUseCase,
      changePasswordUseCase,
      changeEmailUseCase,
      getStreamTicketUseCase,
      revokeSessionUseCase,
      logoutAllUseCase,
      getProfileUseCase,
      updateProfileUseCase,
      redeemVoucherUseCase,
      sendMessageUseCase,
      streamMessageUseCase,
      getChatHistoryUseCase,
      deleteChatSessionUseCase,
      exportChatUseCase,
      listModelsUseCase,
      listAgentsUseCase,
      getAgentUseCase,
      createAgentUseCase,
      updateAgentUseCase,
      deleteAgentUseCase,
      setDefaultAgentUseCase,
      testAgentUseCase,
      getSymbolsUseCase,
      getPricesUseCase,
      getOHLCUseCase,
      fetchNewsUseCase,
      storeNewsUseCase,
      getNewsUseCase,
      getCalendarUseCase,
      getInboxUseCase,
      getSentMessagesUseCase,
      getThreadUseCase,
      sendUserMessageUseCase,
      markMessageReadUseCase,
      deleteMessageUseCase,
      updateNotificationPrefsUseCase,
      getAdminUsersUseCase,
      getAdminUserDetailUseCase,
      updateAdminUserUseCase,
      createAdminUserUseCase,
      deleteAdminUserUseCase,
      resetUserPasswordUseCase,
      createVoucherUseCase,
      listVouchersUseCase,
      revokeVoucherUseCase,
      batchRevokeVouchersUseCase,
      getSystemMetricsUseCase,
      getAnalyticsUseCase,
      getAuditLogsUseCase,
      exportAuditLogsUseCase,
      broadcastMessageUseCase,
      systemCleanupUseCase,
      getAdminUserChatHistoryUseCase,
      listWorkersUseCase,
      controlWorkerUseCase,
      saveSymbolUseCase,
      deleteSymbolUseCase,
      getStreamSymbolsUseCase,
      saveStreamSymbolUseCase,
      deleteStreamSymbolUseCase,
      getOhlcSymbolsUseCase,
      saveOhlcSymbolUseCase,
      deleteOhlcSymbolUseCase,
      deleteNewsUseCase,
      batchDeleteNewsUseCase,
      revokeUserSessionUseCase,
      revokeAllUserSessionsUseCase,
      removeUserDeviceUseCase
    },

    eventDispatcher
  };

  fastify.decorate('container', container);

  // Hook for graceful pool closing on fastify close
  fastify.addHook('onClose', async () => {
    fastify.log.info('Closing PostgreSQL pool and disconnecting Redis...');
    await pgPool.end();
  });
};

export const containerPlugin = fp(containerPluginCallback, {
  name: 'app-container'
});
