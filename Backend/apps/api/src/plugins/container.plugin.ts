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
  const redis = createRedisClient(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);

  // 2. Stores & Repositories
  const captchaStore = new RedisCaptchaStore(redis);
  const ticketStore = new RedisStreamTicketStore(redis);
  const marketDataRepo = new RedisMarketCacheStore(redis);

  const userRepo = new DrizzleUserRepository(db);
  const sessionRepo = new DrizzleSessionRepository(db);
  const deviceRepo = new DrizzleDeviceRepository(db);
  const chatRepo = new DrizzleChatRepository(db);
  const creditRepo = new DrizzleCreditRepository(db);
  const symbolRepo = new DrizzleSymbolRepository(db);
  const streamSymbolRepo = new DrizzleStreamSymbolRepository(db);
  const newsRepo = new DrizzleNewsRepository(db);
  const messageRepo = new DrizzleMessageRepository(db);
  const adminActionRepo = new DrizzleAdminActionRepository(db);
  const activityLogRepo = new DrizzleActivityLogRepository(db);
  const analyticsRepo = new DrizzleAnalyticsRepository(db, redis);
  const usageRepo = new DrizzleUsageRepository(db);
  const verificationRepo = new DrizzleVerificationRepository(db);
  const loginAttemptRepo = new DrizzleLoginAttemptRepository(db);
  const voucherRepo = new DrizzleVoucherRepository(db);
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

  // 4. Application Services
  const authService = new AuthService(sessionRepo, deviceRepo, userRepo);
  const captchaService = new CaptchaService(captchaStore);
  const marketDataService = new MarketDataService(symbolRepo, marketDataRepo, historicalProvider);
  const newsService = new NewsService(newsRepo, newsProvider, notifier);
  const contextInjectionService = new ContextInjectionService(marketDataService, newsService);
  const workerManagerService = new WorkerManagerService();

  // Wire active Redis market price fetcher into SseHub
  if (fastify.sseHub && env.NODE_ENV !== 'test' && !process.env.VITEST) {
    fastify.sseHub.setPriceFetcher(async () => {
      return marketDataRepo.getAllPrices();
    });
  }

  // 5. Event Dispatcher & Handlers
  const eventDispatcher = new EventDispatcher();
  const chatLoggingHandler = new ChatLoggingHandler(chatRepo, creditRepo);
  chatLoggingHandler.register(eventDispatcher);

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
      throw new Error('Google OAuth token verification requires Google API client configuration');
    }
  };

  const registerUseCase = new RegisterUseCase(userRepo, deviceRepo, verificationRepo, authService, emailService, 100, isDevMode, env.DEVICE_ENFORCEMENT);
  const loginUseCase = new LoginUseCase(userRepo, deviceRepo, loginAttemptRepo, authService, captchaService, env.DEVICE_ENFORCEMENT);
  const googleOAuthUseCase = new GoogleOAuthUseCase(userRepo, deviceRepo, authService, mockGoogleVerifier, 100, env.DEVICE_ENFORCEMENT);
  const verifyEmailUseCase = new VerifyEmailUseCase(userRepo, verificationRepo);
  const resendVerificationUseCase = new ResendVerificationUseCase(userRepo, verificationRepo, emailService, isDevMode);
  const forgotPasswordUseCase = new ForgotPasswordUseCase(userRepo, verificationRepo, emailService, isDevMode);
  const resetPasswordUseCase = new ResetPasswordUseCase(userRepo, verificationRepo, sessionRepo, authService);
  const changePasswordUseCase = new ChangePasswordUseCase(userRepo, sessionRepo, authService);
  const changeEmailUseCase = new ChangeEmailUseCase(userRepo, authService);
  const getStreamTicketUseCase = new GetStreamTicketUseCase(ticketStore);
  const revokeSessionUseCase = new RevokeSessionUseCase(sessionRepo);
  const logoutAllUseCase = new LogoutAllUseCase(sessionRepo);
  const getProfileUseCase = new GetProfileUseCase(userRepo);
  const updateProfileUseCase = new UpdateProfileUseCase(userRepo);
  const redeemVoucherUseCase = new RedeemVoucherUseCase(voucherRepo, creditRepo);

  const sendMessageUseCase = new SendMessageUseCase(chatRepo, creditRepo, aiGateway, contextInjectionService, agentRepo, appConfig.defaultModel);
  const streamMessageUseCase = new StreamMessageUseCase(chatRepo, creditRepo, aiGateway, contextInjectionService, eventDispatcher, agentRepo, appConfig.defaultModel);
  const getChatHistoryUseCase = new GetChatHistoryUseCase(chatRepo);
  const deleteChatSessionUseCase = new DeleteChatSessionUseCase(chatRepo);
  const exportChatUseCase = new ExportChatUseCase(chatRepo);
  const listModelsUseCase = new ListModelsUseCase(agentRepo, appConfig.defaultModel);
  const listAgentsUseCase = new ListAgentsUseCase(agentRepo);
  const getAgentUseCase = new GetAgentUseCase(agentRepo);
  const createAgentUseCase = new CreateAgentUseCase(agentRepo);
  const updateAgentUseCase = new UpdateAgentUseCase(agentRepo);
  const deleteAgentUseCase = new DeleteAgentUseCase(agentRepo);
  const setDefaultAgentUseCase = new SetDefaultAgentUseCase(agentRepo);
  const testAgentUseCase = new TestAgentUseCase(agentRepo, aiGateway);

  const getSymbolsUseCase = new GetSymbolsUseCase(marketDataService);
  const getPricesUseCase = new GetPricesUseCase(marketDataService);
  const getOHLCUseCase = new GetOHLCUseCase(marketDataService);

  const fetchNewsUseCase = new FetchNewsUseCase(newsService);
  const storeNewsUseCase = new StoreNewsUseCase(newsRepo);
  const getNewsUseCase = new GetNewsUseCase(newsService);

  const getInboxUseCase = new GetInboxUseCase(messageRepo);
  const getSentMessagesUseCase = new GetSentMessagesUseCase(messageRepo);
  const getThreadUseCase = new GetThreadUseCase(messageRepo);
  const sendUserMessageUseCase = new SendUserMessageUseCase(messageRepo, userRepo, notifier);
  const markMessageReadUseCase = new MarkMessageReadUseCase(messageRepo);
  const deleteMessageUseCase = new DeleteMessageUseCase(messageRepo);
  const updateNotificationPrefsUseCase = new UpdateNotificationPrefsUseCase(messageRepo);

  const getAdminUsersUseCase = new GetAdminUsersUseCase(userRepo);
  const getAdminUserDetailUseCase = new GetAdminUserDetailUseCase(userRepo, sessionRepo, deviceRepo, usageRepo);
  const updateAdminUserUseCase = new UpdateAdminUserUseCase(userRepo, adminActionRepo, sessionRepo);
  const createAdminUserUseCase = new CreateAdminUserUseCase(userRepo, adminActionRepo, authService);
  const deleteAdminUserUseCase = new DeleteAdminUserUseCase(userRepo, adminActionRepo);
  const resetUserPasswordUseCase = new ResetUserPasswordUseCase(userRepo, sessionRepo, adminActionRepo, authService);
  const createVoucherUseCase = new CreateVoucherUseCase(voucherRepo, adminActionRepo);
  const listVouchersUseCase = new ListVouchersUseCase(voucherRepo);
  const revokeVoucherUseCase = new RevokeVoucherUseCase(voucherRepo, adminActionRepo);
  const batchRevokeVouchersUseCase = new BatchRevokeVouchersUseCase(voucherRepo, adminActionRepo);
  const getSystemMetricsUseCase = new GetSystemMetricsUseCase(analyticsRepo);
  const getAnalyticsUseCase = new GetAnalyticsUseCase(analyticsRepo);
  const getAuditLogsUseCase = new GetAuditLogsUseCase(adminActionRepo);
  const exportAuditLogsUseCase = new ExportAuditLogsUseCase(adminActionRepo);
  const broadcastMessageUseCase = new BroadcastMessageUseCase(userRepo, messageRepo, adminActionRepo, notifier);
  const systemCleanupUseCase = new SystemCleanupUseCase(sessionRepo, verificationRepo, loginAttemptRepo);
  const getAdminUserChatHistoryUseCase = new GetAdminUserChatHistoryUseCase(userRepo, chatRepo, adminActionRepo);
  const listWorkersUseCase = new ListWorkersUseCase(workerManagerService);
  const controlWorkerUseCase = new ControlWorkerUseCase(workerManagerService, adminActionRepo);
  const saveSymbolUseCase = new SaveSymbolUseCase(symbolRepo, adminActionRepo);
  const deleteSymbolUseCase = new DeleteSymbolUseCase(symbolRepo, adminActionRepo);
  const getStreamSymbolsUseCase = new GetStreamSymbolsUseCase(streamSymbolRepo);
  const saveStreamSymbolUseCase = new SaveStreamSymbolUseCase(streamSymbolRepo, adminActionRepo);
  const deleteStreamSymbolUseCase = new DeleteStreamSymbolUseCase(streamSymbolRepo, adminActionRepo);

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
      deleteStreamSymbolUseCase
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
