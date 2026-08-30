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
  DrizzleCalendarRepository,
  RedisWorkerCommandBus,
  DukascopyHistoryClient,
  FinnhubNewsAdapter,
  AiGatewayClient,
  SmtpEmailService,
  DrizzleDb
} from '@betrix/infra';
import { createAppConfig, AppConfig } from '@betrix/application';
import {
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
  GetOhlcSymbolsUseCase,
  SaveOhlcSymbolUseCase,
  DeleteOhlcSymbolUseCase,
  DeleteNewsUseCase,
  BatchDeleteNewsUseCase,
  RevokeUserSessionUseCase,
  RevokeAllUserSessionsUseCase,
  RemoveUserDeviceUseCase,
  ChatLoggingHandler
} from '@betrix/application';
import { EventDispatcher, INotifier } from '@betrix/domain';
import { createContainer, asClass, asValue, asFunction, Lifetime } from 'awilix';
import { fastifyAwilixPlugin, type Cradle } from '@fastify/awilix';

// Hoisted to module scope so `Cradle.useCases` can be typed via
// `ReturnType<typeof buildUseCasesGroup>` (avoids listing all 75 use-case
// keys twice). The function is pure (only reads from the `c` proxy) so
// hoisting has no closure cost.
interface UseCasesGroup {
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
  getSymbolsUseCase: GetSymbolsUseCase;
  getPricesUseCase: GetPricesUseCase;
  getOHLCUseCase: GetOHLCUseCase;
  fetchNewsUseCase: FetchNewsUseCase;
  storeNewsUseCase: StoreNewsUseCase;
  getNewsUseCase: GetNewsUseCase;
  getCalendarUseCase: GetCalendarUseCase;
  getInboxUseCase: GetInboxUseCase;
  getSentMessagesUseCase: GetSentMessagesUseCase;
  getThreadUseCase: GetThreadUseCase;
  sendUserMessageUseCase: SendUserMessageUseCase;
  markMessageReadUseCase: MarkMessageReadUseCase;
  deleteMessageUseCase: DeleteMessageUseCase;
  updateNotificationPrefsUseCase: UpdateNotificationPrefsUseCase;
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
  getOhlcSymbolsUseCase: GetOhlcSymbolsUseCase;
  saveOhlcSymbolUseCase: SaveOhlcSymbolUseCase;
  deleteOhlcSymbolUseCase: DeleteOhlcSymbolUseCase;
  deleteNewsUseCase: DeleteNewsUseCase;
  batchDeleteNewsUseCase: BatchDeleteNewsUseCase;
  revokeUserSessionUseCase: RevokeUserSessionUseCase;
  revokeAllUserSessionsUseCase: RevokeAllUserSessionsUseCase;
  removeUserDeviceUseCase: RemoveUserDeviceUseCase;
}

const buildUseCasesGroup = (c: UseCasesGroup) => ({
  registerUseCase: c.registerUseCase,
  loginUseCase: c.loginUseCase,
  googleOAuthUseCase: c.googleOAuthUseCase,
  verifyEmailUseCase: c.verifyEmailUseCase,
  resendVerificationUseCase: c.resendVerificationUseCase,
  forgotPasswordUseCase: c.forgotPasswordUseCase,
  resetPasswordUseCase: c.resetPasswordUseCase,
  changePasswordUseCase: c.changePasswordUseCase,
  changeEmailUseCase: c.changeEmailUseCase,
  getStreamTicketUseCase: c.getStreamTicketUseCase,
  revokeSessionUseCase: c.revokeSessionUseCase,
  logoutAllUseCase: c.logoutAllUseCase,
  getProfileUseCase: c.getProfileUseCase,
  updateProfileUseCase: c.updateProfileUseCase,
  redeemVoucherUseCase: c.redeemVoucherUseCase,
  sendMessageUseCase: c.sendMessageUseCase,
  streamMessageUseCase: c.streamMessageUseCase,
  getChatHistoryUseCase: c.getChatHistoryUseCase,
  deleteChatSessionUseCase: c.deleteChatSessionUseCase,
  exportChatUseCase: c.exportChatUseCase,
  listModelsUseCase: c.listModelsUseCase,
  listAgentsUseCase: c.listAgentsUseCase,
  getAgentUseCase: c.getAgentUseCase,
  createAgentUseCase: c.createAgentUseCase,
  updateAgentUseCase: c.updateAgentUseCase,
  deleteAgentUseCase: c.deleteAgentUseCase,
  setDefaultAgentUseCase: c.setDefaultAgentUseCase,
  testAgentUseCase: c.testAgentUseCase,
  getSymbolsUseCase: c.getSymbolsUseCase,
  getPricesUseCase: c.getPricesUseCase,
  getOHLCUseCase: c.getOHLCUseCase,
  fetchNewsUseCase: c.fetchNewsUseCase,
  storeNewsUseCase: c.storeNewsUseCase,
  getNewsUseCase: c.getNewsUseCase,
  getCalendarUseCase: c.getCalendarUseCase,
  getInboxUseCase: c.getInboxUseCase,
  getSentMessagesUseCase: c.getSentMessagesUseCase,
  getThreadUseCase: c.getThreadUseCase,
  sendUserMessageUseCase: c.sendUserMessageUseCase,
  markMessageReadUseCase: c.markMessageReadUseCase,
  deleteMessageUseCase: c.deleteMessageUseCase,
  updateNotificationPrefsUseCase: c.updateNotificationPrefsUseCase,
  getAdminUsersUseCase: c.getAdminUsersUseCase,
  getAdminUserDetailUseCase: c.getAdminUserDetailUseCase,
  updateAdminUserUseCase: c.updateAdminUserUseCase,
  createAdminUserUseCase: c.createAdminUserUseCase,
  deleteAdminUserUseCase: c.deleteAdminUserUseCase,
  resetUserPasswordUseCase: c.resetUserPasswordUseCase,
  createVoucherUseCase: c.createVoucherUseCase,
  listVouchersUseCase: c.listVouchersUseCase,
  revokeVoucherUseCase: c.revokeVoucherUseCase,
  batchRevokeVouchersUseCase: c.batchRevokeVouchersUseCase,
  getSystemMetricsUseCase: c.getSystemMetricsUseCase,
  getAnalyticsUseCase: c.getAnalyticsUseCase,
  getAuditLogsUseCase: c.getAuditLogsUseCase,
  exportAuditLogsUseCase: c.exportAuditLogsUseCase,
  broadcastMessageUseCase: c.broadcastMessageUseCase,
  systemCleanupUseCase: c.systemCleanupUseCase,
  getAdminUserChatHistoryUseCase: c.getAdminUserChatHistoryUseCase,
  listWorkersUseCase: c.listWorkersUseCase,
  controlWorkerUseCase: c.controlWorkerUseCase,
  saveSymbolUseCase: c.saveSymbolUseCase,
  deleteSymbolUseCase: c.deleteSymbolUseCase,
  getStreamSymbolsUseCase: c.getStreamSymbolsUseCase,
  saveStreamSymbolUseCase: c.saveStreamSymbolUseCase,
  deleteStreamSymbolUseCase: c.deleteStreamSymbolUseCase,
  getOhlcSymbolsUseCase: c.getOhlcSymbolsUseCase,
  saveOhlcSymbolUseCase: c.saveOhlcSymbolUseCase,
  deleteOhlcSymbolUseCase: c.deleteOhlcSymbolUseCase,
  deleteNewsUseCase: c.deleteNewsUseCase,
  batchDeleteNewsUseCase: c.batchDeleteNewsUseCase,
  revokeUserSessionUseCase: c.revokeUserSessionUseCase,
  revokeAllUserSessionsUseCase: c.revokeAllUserSessionsUseCase,
  removeUserDeviceUseCase: c.removeUserDeviceUseCase
});

const containerPluginCallback: FastifyPluginAsync = async (fastify) => {
  // T5.1 — dedicated money pool (falls back to app pool in dev/single-pool mode).
  const appConfig: AppConfig = createAppConfig(env);
  const pgPool = createPgPool(env.DATABASE_URL, 20);
  const db = createDrizzleClient(pgPool);
  const moneyPool = env.DATABASE_URL_MONEY ? createPgPool(env.DATABASE_URL_MONEY, 6) : null;
  const moneyDb = moneyPool ? createDrizzleClient(moneyPool) : db;
  const redis: ReturnType<typeof createRedisClient> = createRedisClient(
    env.UPSTASH_REDIS_REST_URL,
    env.UPSTASH_REDIS_REST_TOKEN
  );

  const isDevMode = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';

  // D2 — Awilix container replaces the hand-rolled `AppContainer` + `decorate('container', …)`.
  // Repos & services use `asClass` (constructor injection by parameter name);
  // use cases use `asFunction` (explicit cradle → constructor mapping) to stay
  // safe across the 75 use-case constructors that mix cradle deps with literal
  // defaults — no `reflect-metadata` needed either way.
  const diContainer = createContainer<Cradle>({ injectionMode: 'PROXY' });

  diContainer.register({
    // Infrastructure roots + cradle primitives
    appConfig: asValue(appConfig),
    pgPool: asValue(pgPool),
    db: asValue(db),
    moneyDb: asValue(moneyDb),
    redis: asValue(redis),
    isDevMode: asValue(isDevMode),
    enforceDeviceBinding: asValue(env.DEVICE_ENFORCEMENT),
    defaultCredits: asValue(100),
    defaultModel: asValue(appConfig.defaultModel),
    finnhubApiKey: asValue(env.FINNHUB_API_KEY),
    newsRecentLimit: asValue(10),
    aiBaseUrl: asValue(env.AI_BASE_URL || 'http://localhost:20128/v1'),
    aiApiKey: asValue(env.AI_API_KEY || 'dev_key'),
    smtpConfig: asValue({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER || 'dev@betrix.io',
      pass: env.SMTP_PASS || 'devpass',
      from: env.SMTP_FROM
    }),

    // Mock / In-Memory notifier for SSE PubSub (needs `fastify.sseHub` from closure)
    notifier: asValue<INotifier>({
      broadcastGlobal: (channel, event, payload) => {
        if (channel === 'market') fastify.sseHub.broadcastMarketTick(payload);
        else if (channel === 'news') fastify.sseHub.broadcastNews(payload);
      },
      broadcastToUser: (userId, event, payload) => {
        fastify.sseHub.broadcastToUser(userId, event, payload);
      }
    }),

    mockGoogleVerifier: asValue({
      verifyIdToken: async (token: string) => {
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
    }),

    dukascopyProvider: asValue(new DukascopyHistoryClient()),

    // Stores
    captchaStore: asClass(RedisCaptchaStore, { lifetime: Lifetime.SINGLETON }),
    ticketStore: asClass(RedisStreamTicketStore, { lifetime: Lifetime.SINGLETON }),

    // Repositories (clean cradle constructors: db, moneyDb, redis, pgPool)
    marketDataRepo: asClass(RedisMarketCacheStore, { lifetime: Lifetime.SINGLETON }),
    userRepo: asClass(DrizzleUserRepository, { lifetime: Lifetime.SINGLETON }),
    sessionRepo: asClass(DrizzleSessionRepository, { lifetime: Lifetime.SINGLETON }),
    deviceRepo: asClass(DrizzleDeviceRepository, { lifetime: Lifetime.SINGLETON }),
    chatRepo: asClass(DrizzleChatRepository, { lifetime: Lifetime.SINGLETON }),
    creditRepo: asClass(DrizzleCreditRepository, { lifetime: Lifetime.SINGLETON }),
    symbolRepo: asClass(DrizzleSymbolRepository, { lifetime: Lifetime.SINGLETON }),
    streamSymbolRepo: asClass(DrizzleStreamSymbolRepository, { lifetime: Lifetime.SINGLETON }),
    ohlcSymbolRepo: asClass(DrizzleOhlcSymbolRepository, { lifetime: Lifetime.SINGLETON }),
    newsRepo: asClass(DrizzleNewsRepository, { lifetime: Lifetime.SINGLETON }),
    messageRepo: asClass(DrizzleMessageRepository, { lifetime: Lifetime.SINGLETON }),
    adminActionRepo: asClass(DrizzleAdminActionRepository, { lifetime: Lifetime.SINGLETON }),
    activityLogRepo: asClass(DrizzleActivityLogRepository, { lifetime: Lifetime.SINGLETON }),
    analyticsRepo: asClass(DrizzleAnalyticsRepository, { lifetime: Lifetime.SINGLETON }),
    usageRepo: asClass(DrizzleUsageRepository, { lifetime: Lifetime.SINGLETON }),
    verificationRepo: asClass(DrizzleVerificationRepository, { lifetime: Lifetime.SINGLETON }),
    loginAttemptRepo: asClass(DrizzleLoginAttemptRepository, { lifetime: Lifetime.SINGLETON }),
    voucherRepo: asClass(DrizzleVoucherRepository, { lifetime: Lifetime.SINGLETON }),
    agentRepo: asClass(DrizzleAiAgentRepository, { lifetime: Lifetime.SINGLETON }),
    calendarRepo: asClass(DrizzleCalendarRepository, { lifetime: Lifetime.SINGLETON }),
    workerStateRepo: asClass(DrizzleWorkerStateRepository, { lifetime: Lifetime.SINGLETON }),

    // Adapters
    historicalProvider: asClass(CachedMarketDataProvider, { lifetime: Lifetime.SINGLETON }),
    newsProvider: asFunction(
      ({ finnhubApiKey, newsRecentLimit }: { finnhubApiKey: string; newsRecentLimit: number }) =>
        new FinnhubNewsAdapter(finnhubApiKey || 'sandbox', newsRecentLimit),
      { lifetime: Lifetime.SINGLETON }
    ),
    aiGateway: asFunction(
      ({ aiBaseUrl, aiApiKey }: { aiBaseUrl: string; aiApiKey: string }) =>
        new AiGatewayClient(aiBaseUrl, aiApiKey),
      { lifetime: Lifetime.SINGLETON }
    ),
    emailService: asFunction(
      ({
        smtpConfig
      }: {
        smtpConfig: { host: string; port: number; user: string; pass: string; from: string };
      }) => new SmtpEmailService(smtpConfig),
      { lifetime: Lifetime.SINGLETON }
    ),

    // Services
    authService: asClass(AuthService, { lifetime: Lifetime.SINGLETON }),
    captchaService: asClass(CaptchaService, { lifetime: Lifetime.SINGLETON }),
    marketDataService: asClass(MarketDataService, { lifetime: Lifetime.SINGLETON }),
    newsService: asClass(NewsService, { lifetime: Lifetime.SINGLETON }),
    contextInjectionService: asClass(ContextInjectionService, { lifetime: Lifetime.SINGLETON }),
    workerCommandBus: asClass(RedisWorkerCommandBus, { lifetime: Lifetime.SINGLETON }),
    workerCommandPublisher: asFunction(
      ({
        workerCommandBus
      }: {
        workerCommandBus: RedisWorkerCommandBus;
      }): IWorkerCommandPublisher => ({
        async publishCommand(workerId, action, adminId) {
          await workerCommandBus.publishCommand(workerId, {
            action,
            adminId,
            timestamp: Date.now()
          });
        }
      }),
      { lifetime: Lifetime.SINGLETON }
    ),
    workerManagerService: asClass(WorkerManagerService, { lifetime: Lifetime.SINGLETON }),

    eventDispatcher: asValue(
      new EventDispatcher((eventName, err) => {
        fastify.log.error({ err, eventName }, 'Event handler failed');
      })
    ),
    chatLoggingHandler: asClass(ChatLoggingHandler, { lifetime: Lifetime.SINGLETON })
  });

  // Use cases — `asFunction` (explicit cradle → constructor mapping) so we
  // don't depend on every constructor's parameter names matching cradle keys.
  diContainer.register({
    registerUseCase: asFunction(
      (c: any) =>
        new RegisterUseCase(
          c.userRepo,
          c.deviceRepo,
          c.verificationRepo,
          c.authService,
          c.emailService,
          c.defaultCredits,
          c.isDevMode,
          c.enforceDeviceBinding,
          c.activityLogRepo
        ),
      { lifetime: Lifetime.SINGLETON }
    ),
    loginUseCase: asFunction(
      (c: any) =>
        new LoginUseCase(
          c.userRepo,
          c.deviceRepo,
          c.loginAttemptRepo,
          c.authService,
          c.captchaService,
          c.enforceDeviceBinding,
          c.activityLogRepo
        ),
      { lifetime: Lifetime.SINGLETON }
    ),
    googleOAuthUseCase: asFunction(
      (c: any) =>
        new GoogleOAuthUseCase(
          c.userRepo,
          c.deviceRepo,
          c.authService,
          c.mockGoogleVerifier,
          c.defaultCredits,
          c.enforceDeviceBinding
        ),
      { lifetime: Lifetime.SINGLETON }
    ),
    verifyEmailUseCase: asFunction(
      (c: any) => new VerifyEmailUseCase(c.userRepo, c.verificationRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    resendVerificationUseCase: asFunction(
      (c: any) =>
        new ResendVerificationUseCase(c.userRepo, c.verificationRepo, c.emailService, c.isDevMode),
      { lifetime: Lifetime.SINGLETON }
    ),
    forgotPasswordUseCase: asFunction(
      (c: any) =>
        new ForgotPasswordUseCase(c.userRepo, c.verificationRepo, c.emailService, c.isDevMode),
      { lifetime: Lifetime.SINGLETON }
    ),
    resetPasswordUseCase: asFunction(
      (c: any) =>
        new ResetPasswordUseCase(c.userRepo, c.verificationRepo, c.sessionRepo, c.authService),
      { lifetime: Lifetime.SINGLETON }
    ),
    changePasswordUseCase: asFunction(
      (c: any) => new ChangePasswordUseCase(c.userRepo, c.sessionRepo, c.authService),
      { lifetime: Lifetime.SINGLETON }
    ),
    changeEmailUseCase: asFunction((c: any) => new ChangeEmailUseCase(c.userRepo, c.authService), {
      lifetime: Lifetime.SINGLETON
    }),
    getStreamTicketUseCase: asFunction((c: any) => new GetStreamTicketUseCase(c.ticketStore), {
      lifetime: Lifetime.SINGLETON
    }),
    revokeSessionUseCase: asFunction(
      (c: any) => new RevokeSessionUseCase(c.sessionRepo, c.activityLogRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    logoutAllUseCase: asFunction(
      (c: any) => new LogoutAllUseCase(c.sessionRepo, c.activityLogRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    getProfileUseCase: asFunction((c: any) => new GetProfileUseCase(c.userRepo), {
      lifetime: Lifetime.SINGLETON
    }),
    updateProfileUseCase: asFunction((c: any) => new UpdateProfileUseCase(c.userRepo), {
      lifetime: Lifetime.SINGLETON
    }),
    redeemVoucherUseCase: asFunction(
      (c: any) => new RedeemVoucherUseCase(c.voucherRepo, c.creditRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    sendMessageUseCase: asFunction(
      (c: any) =>
        new SendMessageUseCase(
          c.chatRepo,
          c.creditRepo,
          c.aiGateway,
          c.contextInjectionService,
          c.agentRepo,
          c.defaultModel
        ),
      { lifetime: Lifetime.SINGLETON }
    ),
    streamMessageUseCase: asFunction(
      (c: any) =>
        new StreamMessageUseCase(
          c.chatRepo,
          c.creditRepo,
          c.aiGateway,
          c.contextInjectionService,
          c.eventDispatcher,
          c.agentRepo,
          c.defaultModel
        ),
      { lifetime: Lifetime.SINGLETON }
    ),
    getChatHistoryUseCase: asFunction((c: any) => new GetChatHistoryUseCase(c.chatRepo), {
      lifetime: Lifetime.SINGLETON
    }),
    deleteChatSessionUseCase: asFunction((c: any) => new DeleteChatSessionUseCase(c.chatRepo), {
      lifetime: Lifetime.SINGLETON
    }),
    exportChatUseCase: asFunction((c: any) => new ExportChatUseCase(c.chatRepo), {
      lifetime: Lifetime.SINGLETON
    }),
    listModelsUseCase: asFunction((c: any) => new ListModelsUseCase(c.agentRepo, c.defaultModel), {
      lifetime: Lifetime.SINGLETON
    }),
    listAgentsUseCase: asFunction((c: any) => new ListAgentsUseCase(c.agentRepo), {
      lifetime: Lifetime.SINGLETON
    }),
    getAgentUseCase: asFunction((c: any) => new GetAgentUseCase(c.agentRepo), {
      lifetime: Lifetime.SINGLETON
    }),
    createAgentUseCase: asFunction(
      (c: any) => new CreateAgentUseCase(c.agentRepo, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    updateAgentUseCase: asFunction(
      (c: any) => new UpdateAgentUseCase(c.agentRepo, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    deleteAgentUseCase: asFunction(
      (c: any) => new DeleteAgentUseCase(c.agentRepo, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    setDefaultAgentUseCase: asFunction(
      (c: any) => new SetDefaultAgentUseCase(c.agentRepo, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    testAgentUseCase: asFunction((c: any) => new TestAgentUseCase(c.agentRepo, c.aiGateway), {
      lifetime: Lifetime.SINGLETON
    }),
    getSymbolsUseCase: asFunction((c: any) => new GetSymbolsUseCase(c.marketDataService), {
      lifetime: Lifetime.SINGLETON
    }),
    getPricesUseCase: asFunction((c: any) => new GetPricesUseCase(c.marketDataService), {
      lifetime: Lifetime.SINGLETON
    }),
    getOHLCUseCase: asFunction((c: any) => new GetOHLCUseCase(c.marketDataService), {
      lifetime: Lifetime.SINGLETON
    }),
    fetchNewsUseCase: asFunction(
      (c: any) => new FetchNewsUseCase(c.newsService, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    storeNewsUseCase: asFunction((c: any) => new StoreNewsUseCase(c.newsRepo), {
      lifetime: Lifetime.SINGLETON
    }),
    getNewsUseCase: asFunction((c: any) => new GetNewsUseCase(c.newsService), {
      lifetime: Lifetime.SINGLETON
    }),
    getCalendarUseCase: asFunction((c: any) => new GetCalendarUseCase(c.calendarRepo), {
      lifetime: Lifetime.SINGLETON
    }),
    getInboxUseCase: asFunction((c: any) => new GetInboxUseCase(c.messageRepo), {
      lifetime: Lifetime.SINGLETON
    }),
    getSentMessagesUseCase: asFunction((c: any) => new GetSentMessagesUseCase(c.messageRepo), {
      lifetime: Lifetime.SINGLETON
    }),
    getThreadUseCase: asFunction((c: any) => new GetThreadUseCase(c.messageRepo), {
      lifetime: Lifetime.SINGLETON
    }),
    sendUserMessageUseCase: asFunction(
      (c: any) => new SendUserMessageUseCase(c.messageRepo, c.userRepo, c.notifier),
      { lifetime: Lifetime.SINGLETON }
    ),
    markMessageReadUseCase: asFunction((c: any) => new MarkMessageReadUseCase(c.messageRepo), {
      lifetime: Lifetime.SINGLETON
    }),
    deleteMessageUseCase: asFunction((c: any) => new DeleteMessageUseCase(c.messageRepo), {
      lifetime: Lifetime.SINGLETON
    }),
    updateNotificationPrefsUseCase: asFunction(
      (c: any) => new UpdateNotificationPrefsUseCase(c.messageRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    getAdminUsersUseCase: asFunction((c: any) => new GetAdminUsersUseCase(c.userRepo), {
      lifetime: Lifetime.SINGLETON
    }),
    getAdminUserDetailUseCase: asFunction(
      (c: any) =>
        new GetAdminUserDetailUseCase(
          c.userRepo,
          c.sessionRepo,
          c.deviceRepo,
          c.usageRepo,
          c.activityLogRepo
        ),
      { lifetime: Lifetime.SINGLETON }
    ),
    updateAdminUserUseCase: asFunction(
      (c: any) =>
        new UpdateAdminUserUseCase(
          c.userRepo,
          c.adminActionRepo,
          c.sessionRepo,
          c.creditRepo,
          c.notifier
        ),
      { lifetime: Lifetime.SINGLETON }
    ),
    createAdminUserUseCase: asFunction(
      (c: any) => new CreateAdminUserUseCase(c.userRepo, c.adminActionRepo, c.authService),
      { lifetime: Lifetime.SINGLETON }
    ),
    deleteAdminUserUseCase: asFunction(
      (c: any) => new DeleteAdminUserUseCase(c.userRepo, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    resetUserPasswordUseCase: asFunction(
      (c: any) =>
        new ResetUserPasswordUseCase(c.userRepo, c.sessionRepo, c.adminActionRepo, c.authService),
      { lifetime: Lifetime.SINGLETON }
    ),
    createVoucherUseCase: asFunction(
      (c: any) => new CreateVoucherUseCase(c.voucherRepo, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    listVouchersUseCase: asFunction((c: any) => new ListVouchersUseCase(c.voucherRepo), {
      lifetime: Lifetime.SINGLETON
    }),
    revokeVoucherUseCase: asFunction(
      (c: any) => new RevokeVoucherUseCase(c.voucherRepo, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    batchRevokeVouchersUseCase: asFunction(
      (c: any) => new BatchRevokeVouchersUseCase(c.voucherRepo, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    getSystemMetricsUseCase: asFunction((c: any) => new GetSystemMetricsUseCase(c.analyticsRepo), {
      lifetime: Lifetime.SINGLETON
    }),
    getAnalyticsUseCase: asFunction((c: any) => new GetAnalyticsUseCase(c.analyticsRepo), {
      lifetime: Lifetime.SINGLETON
    }),
    getAuditLogsUseCase: asFunction(
      (c: any) => new GetAuditLogsUseCase(c.adminActionRepo, c.userRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    exportAuditLogsUseCase: asFunction((c: any) => new ExportAuditLogsUseCase(c.adminActionRepo), {
      lifetime: Lifetime.SINGLETON
    }),
    broadcastMessageUseCase: asFunction(
      (c: any) =>
        new BroadcastMessageUseCase(c.userRepo, c.messageRepo, c.adminActionRepo, c.notifier),
      { lifetime: Lifetime.SINGLETON }
    ),
    systemCleanupUseCase: asFunction(
      (c: any) =>
        new SystemCleanupUseCase(
          c.sessionRepo,
          c.verificationRepo,
          c.loginAttemptRepo,
          c.adminActionRepo,
          c.deviceRepo,
          c.newsRepo,
          c.voucherRepo,
          c.chatRepo,
          c.activityLogRepo
        ),
      { lifetime: Lifetime.SINGLETON }
    ),
    getAdminUserChatHistoryUseCase: asFunction(
      (c: any) => new GetAdminUserChatHistoryUseCase(c.userRepo, c.chatRepo, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    listWorkersUseCase: asFunction((c: any) => new ListWorkersUseCase(c.workerManagerService), {
      lifetime: Lifetime.SINGLETON
    }),
    controlWorkerUseCase: asFunction(
      (c: any) => new ControlWorkerUseCase(c.workerManagerService, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    saveSymbolUseCase: asFunction(
      (c: any) => new SaveSymbolUseCase(c.symbolRepo, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    deleteSymbolUseCase: asFunction(
      (c: any) => new DeleteSymbolUseCase(c.symbolRepo, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    getStreamSymbolsUseCase: asFunction(
      (c: any) => new GetStreamSymbolsUseCase(c.streamSymbolRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    saveStreamSymbolUseCase: asFunction(
      (c: any) => new SaveStreamSymbolUseCase(c.streamSymbolRepo, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    deleteStreamSymbolUseCase: asFunction(
      (c: any) => new DeleteStreamSymbolUseCase(c.streamSymbolRepo, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    getOhlcSymbolsUseCase: asFunction((c: any) => new GetOhlcSymbolsUseCase(c.ohlcSymbolRepo), {
      lifetime: Lifetime.SINGLETON
    }),
    saveOhlcSymbolUseCase: asFunction(
      (c: any) => new SaveOhlcSymbolUseCase(c.ohlcSymbolRepo, c.symbolRepo, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    deleteOhlcSymbolUseCase: asFunction(
      (c: any) => new DeleteOhlcSymbolUseCase(c.ohlcSymbolRepo, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    deleteNewsUseCase: asFunction(
      (c: any) => new DeleteNewsUseCase(c.newsRepo, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    batchDeleteNewsUseCase: asFunction(
      (c: any) => new BatchDeleteNewsUseCase(c.newsRepo, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    revokeUserSessionUseCase: asFunction(
      (c: any) => new RevokeUserSessionUseCase(c.sessionRepo, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    revokeAllUserSessionsUseCase: asFunction(
      (c: any) => new RevokeAllUserSessionsUseCase(c.sessionRepo, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),
    removeUserDeviceUseCase: asFunction(
      (c: any) => new RemoveUserDeviceUseCase(c.deviceRepo, c.adminActionRepo),
      { lifetime: Lifetime.SINGLETON }
    ),

    // Nested grouping (preserves the `const { useCases } = cradle` route pattern)
    useCases: asFunction(buildUseCasesGroup, { lifetime: Lifetime.SINGLETON }),
    repositories: asFunction(
      (c: any) => ({
        userRepo: c.userRepo,
        sessionRepo: c.sessionRepo,
        deviceRepo: c.deviceRepo,
        chatRepo: c.chatRepo,
        creditRepo: c.creditRepo,
        symbolRepo: c.symbolRepo,
        streamSymbolRepo: c.streamSymbolRepo,
        ohlcSymbolRepo: c.ohlcSymbolRepo,
        newsRepo: c.newsRepo,
        messageRepo: c.messageRepo,
        adminActionRepo: c.adminActionRepo,
        activityLogRepo: c.activityLogRepo,
        analyticsRepo: c.analyticsRepo,
        usageRepo: c.usageRepo,
        verificationRepo: c.verificationRepo,
        loginAttemptRepo: c.loginAttemptRepo,
        voucherRepo: c.voucherRepo,
        agentRepo: c.agentRepo,
        marketDataRepo: c.marketDataRepo
      }),
      { lifetime: Lifetime.SINGLETON }
    ),
    stores: asFunction((c: any) => ({ captchaStore: c.captchaStore, ticketStore: c.ticketStore }), {
      lifetime: Lifetime.SINGLETON
    }),
    adapters: asFunction(
      (c: any) => ({
        historicalProvider: c.historicalProvider,
        newsProvider: c.newsProvider,
        aiGateway: c.aiGateway,
        emailService: c.emailService
      }),
      { lifetime: Lifetime.SINGLETON }
    ),
    services: asFunction(
      (c: any) => ({
        authService: c.authService,
        captchaService: c.captchaService,
        marketDataService: c.marketDataService,
        newsService: c.newsService,
        contextInjectionService: c.contextInjectionService,
        workerManagerService: c.workerManagerService
      }),
      { lifetime: Lifetime.SINGLETON }
    )
  });

  await fastify.register(fastifyAwilixPlugin, { container: diContainer });

  // ChatLoggingHandler is not auto-registered; wire it the same way the old
  // container did.
  fastify.diContainer.cradle.chatLoggingHandler.register(
    fastify.diContainer.cradle.eventDispatcher
  );

  // Wire active Redis market price fetcher into SseHub
  if (fastify.sseHub && env.NODE_ENV !== 'test' && !process.env.VITEST) {
    fastify.sseHub.setPriceFetcher(() => fastify.diContainer.cradle.marketDataRepo.getAllPrices());
  }

  // Wire dashboard ops snapshot pusher into SseHub
  if (fastify.sseHub && env.NODE_ENV !== 'test' && !process.env.VITEST) {
    fastify.sseHub.setOpsFetcher(async () => {
      const c = fastify.diContainer.cradle;
      const source = env.OPS_SOURCE || 'cache';
      const metrics =
        source === 'cache'
          ? await c.analyticsRepo.getCachedSystemMetrics()
          : await c.getSystemMetricsUseCase.execute();
      const analytics =
        source === 'cache'
          ? await c.analyticsRepo.getUserAnalyticsCached()
          : await c.getAnalyticsUseCase.execute();
      return { metrics, analytics };
    });
  }

  // Relay freshly-ingested news rows to browser SSE subscribers. Preserved
  // verbatim from the pre-D2 container (the unbounded Set leak is a separate
  // P16 finding — deferred to a follow-up).
  const seenNewsIds = new Set<string>();
  let seenNewsPrimed = false;
  const newsRelayTimer = setInterval(async () => {
    if (!fastify.sseHub.hasClientsFor('news')) return;
    try {
      const latest = await fastify.diContainer.cradle.newsRepo.findRecent(25);
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

  // T3.1 — Ops Aggregator: every 60s (only while an admin dashboard has an
  // open 'ops' SSE stream). Preserved from pre-D2.
  let opsTimer: NodeJS.Timeout | null = null;
  if (env.NODE_ENV !== 'test' && !process.env.VITEST) {
    const aggMs = env.OPS_AGGREGATOR_INTERVAL_MS || 60_000;
    opsTimer = setInterval(async () => {
      try {
        if (!fastify.sseHub?.hasClientsFor('ops')) return;
        const c = fastify.diContainer.cradle;
        const lockKey = (await import('@betrix/infra')).redisKeys.opsLock('metrics');
        const got = await c.redis.set(lockKey, String(Date.now()), {
          nx: true,
          px: Math.ceil(aggMs * 0.9)
        });
        if (got !== 'OK') return;
        const m = await c.getSystemMetricsUseCase.execute();
        await c.analyticsRepo.writeGauges(m);
        const a = await c.getAnalyticsUseCase.execute();
        await c.analyticsRepo.writeAnalyticsCache(a);
      } catch (err: any) {
        fastify.log.warn({ err: err.message }, '[OPS AGGREGATOR] snapshot failed');
      }
    }, aggMs);
  }

  fastify.addHook('onClose', async () => {
    clearInterval(newsRelayTimer);
    if (opsTimer) clearInterval(opsTimer);
    // P17 — close the Postgres pool on shutdown. The Upstash REST Redis
    // client is request-scoped (no persistent socket), so there's no
    // `quit()`/`close()` to call; `Promise.allSettled` keeps the hook
    // resilient if a future Redis client does need explicit teardown.
    fastify.log.info('Closing PostgreSQL pool and disconnecting Redis...');
    await Promise.allSettled([pgPool.end()]);
  });
};

export const containerPlugin = fp(containerPluginCallback, {
  name: 'app-container'
});

declare module '@fastify/awilix' {
  interface Cradle {
    config: AppConfig;
    pgPool: ReturnType<typeof createPgPool>;
    db: DrizzleDb;
    moneyDb: DrizzleDb;
    redis: ReturnType<typeof createRedisClient>;
    marketDataRepo: RedisMarketCacheStore;
    analyticsRepo: DrizzleAnalyticsRepository;
    newsRepo: DrizzleNewsRepository;
    getSystemMetricsUseCase: GetSystemMetricsUseCase;
    getAnalyticsUseCase: GetAnalyticsUseCase;
    chatLoggingHandler: ChatLoggingHandler;
    eventDispatcher: EventDispatcher;
    notifier: INotifier;
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
    };
    stores: { captchaStore: RedisCaptchaStore; ticketStore: RedisStreamTicketStore };
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
    useCases: UseCasesGroup;
  }
}
