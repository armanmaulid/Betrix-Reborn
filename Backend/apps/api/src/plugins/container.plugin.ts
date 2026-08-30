import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { fastifyAwilixPlugin } from '@fastify/awilix';
import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  type AwilixContainer,
  type InferCradleFromResolvers
} from 'awilix';
import { env } from '@betrix/config';
import {
  createPgPool,
  createDrizzleClient,
  createRedisClient,
  redisKeys,
  RedisCaptchaStore,
  RedisStreamTicketStore,
  RedisMarketCacheStore,
  RedisWorkerCommandBus,
  CachedMarketDataProvider,
  DrizzleDb,
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
  DukascopyHistoryClient,
  FinnhubNewsAdapter,
  AiGatewayClient,
  SmtpEmailService
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
  GoogleVerifierNotConfiguredError,
  ChatLoggingHandler
} from '@betrix/application';
import * as UC from '@betrix/application';
import { EventDispatcher, INotifier } from '@betrix/domain';

declare module 'fastify' {
  interface FastifyInstance {
    container: AppContainer;
  }
}

// ----------------------------------------------------------------------------
// Resolver objects. Each `*Resolvers` literal's CRADLE type is derived via
// `InferCradleFromResolvers` — no manual 75-key interface. The aggregate
// `Cradle` is the intersection of all of them, so every binding is type-safe.
// ----------------------------------------------------------------------------

const repoResolvers = {
  userRepo: asClass(DrizzleUserRepository),
  sessionRepo: asClass(DrizzleSessionRepository),
  deviceRepo: asClass(DrizzleDeviceRepository),
  chatRepo: asClass(DrizzleChatRepository),
  creditRepo: asClass(DrizzleCreditRepository),
  symbolRepo: asClass(DrizzleSymbolRepository),
  streamSymbolRepo: asClass(DrizzleStreamSymbolRepository),
  ohlcSymbolRepo: asClass(DrizzleOhlcSymbolRepository),
  newsRepo: asClass(DrizzleNewsRepository),
  messageRepo: asClass(DrizzleMessageRepository),
  adminActionRepo: asClass(DrizzleAdminActionRepository),
  activityLogRepo: asClass(DrizzleActivityLogRepository),
  analyticsRepo: asClass(DrizzleAnalyticsRepository),
  usageRepo: asClass(DrizzleUsageRepository),
  verificationRepo: asClass(DrizzleVerificationRepository),
  loginAttemptRepo: asClass(DrizzleLoginAttemptRepository),
  voucherRepo: asClass(DrizzleVoucherRepository),
  agentRepo: asClass(DrizzleAiAgentRepository),
  marketDataRepo: asClass(RedisMarketCacheStore)
};
type RepoCradle = InferCradleFromResolvers<typeof repoResolvers>;

const storeResolvers = {
  captchaStore: asClass(RedisCaptchaStore),
  ticketStore: asClass(RedisStreamTicketStore)
};
type StoreCradle = InferCradleFromResolvers<typeof storeResolvers>;

const adapterResolvers = {
  workerStateRepo: asClass(DrizzleWorkerStateRepository),
  calendarRepo: asClass(DrizzleCalendarRepository),
  dukascopyProvider: asClass(DukascopyHistoryClient),
  historicalProvider: asClass(CachedMarketDataProvider),
  newsProvider: asClass(FinnhubNewsAdapter),
  aiGateway: asClass(AiGatewayClient),
  emailService: asClass(SmtpEmailService),
  workerCommandBus: asClass(RedisWorkerCommandBus),
  workerCommandPublisher: asFunction(
    ({ workerCommandBus }: { workerCommandBus: RedisWorkerCommandBus }): IWorkerCommandPublisher => ({
      async publishCommand(workerId, action, adminId) {
        await workerCommandBus.publishCommand(workerId, { action, adminId, timestamp: Date.now() });
      }
    })
  )
};
type AdapterCradle = InferCradleFromResolvers<typeof adapterResolvers>;

const serviceResolvers = {
  authService: asClass(AuthService),
  captchaService: asClass(CaptchaService),
  marketDataService: asClass(MarketDataService),
  newsService: asClass(NewsService),
  contextInjectionService: asClass(ContextInjectionService),
  workerManagerService: asClass(WorkerManagerService)
};
type ServiceCradle = InferCradleFromResolvers<typeof serviceResolvers>;

const useCaseResolvers = {
  registerUseCase: asClass(UC.RegisterUseCase),
  loginUseCase: asClass(UC.LoginUseCase),
  googleOAuthUseCase: asClass(UC.GoogleOAuthUseCase),
  verifyEmailUseCase: asClass(UC.VerifyEmailUseCase),
  resendVerificationUseCase: asClass(UC.ResendVerificationUseCase),
  forgotPasswordUseCase: asClass(UC.ForgotPasswordUseCase),
  resetPasswordUseCase: asClass(UC.ResetPasswordUseCase),
  changePasswordUseCase: asClass(UC.ChangePasswordUseCase),
  changeEmailUseCase: asClass(UC.ChangeEmailUseCase),
  getStreamTicketUseCase: asClass(UC.GetStreamTicketUseCase),
  revokeSessionUseCase: asClass(UC.RevokeSessionUseCase),
  logoutAllUseCase: asClass(UC.LogoutAllUseCase),
  getProfileUseCase: asClass(UC.GetProfileUseCase),
  updateProfileUseCase: asClass(UC.UpdateProfileUseCase),
  redeemVoucherUseCase: asClass(UC.RedeemVoucherUseCase),
  sendMessageUseCase: asClass(UC.SendMessageUseCase),
  streamMessageUseCase: asClass(UC.StreamMessageUseCase),
  getChatHistoryUseCase: asClass(UC.GetChatHistoryUseCase),
  deleteChatSessionUseCase: asClass(UC.DeleteChatSessionUseCase),
  exportChatUseCase: asClass(UC.ExportChatUseCase),
  listModelsUseCase: asClass(UC.ListModelsUseCase),
  listAgentsUseCase: asClass(UC.ListAgentsUseCase),
  getAgentUseCase: asClass(UC.GetAgentUseCase),
  createAgentUseCase: asClass(UC.CreateAgentUseCase),
  updateAgentUseCase: asClass(UC.UpdateAgentUseCase),
  deleteAgentUseCase: asClass(UC.DeleteAgentUseCase),
  setDefaultAgentUseCase: asClass(UC.SetDefaultAgentUseCase),
  testAgentUseCase: asClass(UC.TestAgentUseCase),
  getSymbolsUseCase: asClass(UC.GetSymbolsUseCase),
  getPricesUseCase: asClass(UC.GetPricesUseCase),
  getOHLCUseCase: asClass(UC.GetOHLCUseCase),
  fetchNewsUseCase: asClass(UC.FetchNewsUseCase),
  storeNewsUseCase: asClass(UC.StoreNewsUseCase),
  getNewsUseCase: asClass(UC.GetNewsUseCase),
  getCalendarUseCase: asClass(UC.GetCalendarUseCase),
  getInboxUseCase: asClass(UC.GetInboxUseCase),
  getSentMessagesUseCase: asClass(UC.GetSentMessagesUseCase),
  getThreadUseCase: asClass(UC.GetThreadUseCase),
  sendUserMessageUseCase: asClass(UC.SendUserMessageUseCase),
  markMessageReadUseCase: asClass(UC.MarkMessageReadUseCase),
  deleteMessageUseCase: asClass(UC.DeleteMessageUseCase),
  updateNotificationPrefsUseCase: asClass(UC.UpdateNotificationPrefsUseCase),
  getAdminUsersUseCase: asClass(UC.GetAdminUsersUseCase),
  getAdminUserDetailUseCase: asClass(UC.GetAdminUserDetailUseCase),
  updateAdminUserUseCase: asClass(UC.UpdateAdminUserUseCase),
  createAdminUserUseCase: asClass(UC.CreateAdminUserUseCase),
  deleteAdminUserUseCase: asClass(UC.DeleteAdminUserUseCase),
  resetUserPasswordUseCase: asClass(UC.ResetUserPasswordUseCase),
  createVoucherUseCase: asClass(UC.CreateVoucherUseCase),
  listVouchersUseCase: asClass(UC.ListVouchersUseCase),
  revokeVoucherUseCase: asClass(UC.RevokeVoucherUseCase),
  batchRevokeVouchersUseCase: asClass(UC.BatchRevokeVouchersUseCase),
  getSystemMetricsUseCase: asClass(UC.GetSystemMetricsUseCase),
  getAnalyticsUseCase: asClass(UC.GetAnalyticsUseCase),
  getAuditLogsUseCase: asClass(UC.GetAuditLogsUseCase),
  exportAuditLogsUseCase: asClass(UC.ExportAuditLogsUseCase),
  broadcastMessageUseCase: asClass(UC.BroadcastMessageUseCase),
  systemCleanupUseCase: asClass(UC.SystemCleanupUseCase),
  getAdminUserChatHistoryUseCase: asClass(UC.GetAdminUserChatHistoryUseCase),
  listWorkersUseCase: asClass(UC.ListWorkersUseCase),
  controlWorkerUseCase: asClass(UC.ControlWorkerUseCase),
  saveSymbolUseCase: asClass(UC.SaveSymbolUseCase),
  deleteSymbolUseCase: asClass(UC.DeleteSymbolUseCase),
  getStreamSymbolsUseCase: asClass(UC.GetStreamSymbolsUseCase),
  saveStreamSymbolUseCase: asClass(UC.SaveStreamSymbolUseCase),
  deleteStreamSymbolUseCase: asClass(UC.DeleteStreamSymbolUseCase),
  getOhlcSymbolsUseCase: asClass(UC.GetOhlcSymbolsUseCase),
  saveOhlcSymbolUseCase: asClass(UC.SaveOhlcSymbolUseCase),
  deleteOhlcSymbolUseCase: asClass(UC.DeleteOhlcSymbolUseCase),
  deleteNewsUseCase: asClass(UC.DeleteNewsUseCase),
  batchDeleteNewsUseCase: asClass(UC.BatchDeleteNewsUseCase),
  revokeUserSessionUseCase: asClass(UC.RevokeUserSessionUseCase),
  revokeAllUserSessionsUseCase: asClass(UC.RevokeAllUserSessionsUseCase),
  removeUserDeviceUseCase: asClass(UC.RemoveUserDeviceUseCase)
};
type UseCaseCradle = InferCradleFromResolvers<typeof useCaseResolvers>;

// Groupings project individual cradle bindings into nested namespaces that
// match the legacy `fastify.container.repositories.userRepo` shape used by
// the routes + tests. The grouping's type is derived from the source
// cradle's keys (one map per grouping), so nothing is hand-written.
const repositoriesGrouping = asFunction(
  (c: RepoCradle): RepoCradle =>
    Object.fromEntries(Object.keys(repoResolvers).map((k) => [k, c[k as keyof RepoCradle]])) as RepoCradle
);
const storesGrouping = asFunction(
  (c: StoreCradle): StoreCradle =>
    Object.fromEntries(Object.keys(storeResolvers).map((k) => [k, c[k as keyof StoreCradle]])) as StoreCradle
);
const adaptersGrouping = asFunction(
  (c: AdapterCradle): AdapterCradle =>
    Object.fromEntries(
      Object.keys(adapterResolvers).map((k) => [k, c[k as keyof AdapterCradle]])
    ) as AdapterCradle
);
const servicesGrouping = asFunction(
  (c: ServiceCradle): ServiceCradle =>
    Object.fromEntries(
      Object.keys(serviceResolvers).map((k) => [k, c[k as keyof ServiceCradle]])
    ) as ServiceCradle
);
const useCasesGrouping = asFunction(
  (c: UseCaseCradle): UseCaseCradle =>
    Object.fromEntries(
      Object.keys(useCaseResolvers).map((k) => [k, c[k as keyof UseCaseCradle]])
    ) as UseCaseCradle
);

// Aggregate cradle = union of all binding cradles. The local `diContainer`
// is typed `AwilixContainer<AppCradle>`, so `diContainer.cradle` is fully typed
// end-to-end (no `any` in the chain).
type AppCradle = InferCradleFromResolvers<typeof repoResolvers> &
  InferCradleFromResolvers<typeof storeResolvers> &
  InferCradleFromResolvers<typeof adapterResolvers> &
  InferCradleFromResolvers<typeof serviceResolvers> &
  InferCradleFromResolvers<typeof useCaseResolvers> & {
    pgPool: ReturnType<typeof createPgPool>;
    db: DrizzleDb;
    moneyDb: DrizzleDb;
    redis: ReturnType<typeof createRedisClient>;
    appConfig: AppConfig;
    notifier: INotifier;
    eventDispatcher: EventDispatcher;
    chatLoggingHandler: ChatLoggingHandler;
    sseHub: any;
    mockGoogleVerifier: { verifyIdToken: (token: string) => Promise<any> };
    repositories: RepoCradle;
    stores: StoreCradle;
    adapters: AdapterCradle;
    services: ServiceCradle;
    useCases: UseCaseCradle;
  };

// Hand-rolled `AppContainer` mirror for the public `fastify.container`
// surface (the routes access `fastify.container.repositories.userRepo` etc.).
// It's DERIVED from the cradles above — every binding type follows the data.
interface AppContainer {
  repositories: RepoCradle;
  stores: StoreCradle;
  adapters: AdapterCradle;
  services: ServiceCradle;
  useCases: UseCaseCradle;
  pgPool: ReturnType<typeof createPgPool>;
  db: DrizzleDb;
  redis: ReturnType<typeof createRedisClient>;
  eventDispatcher: EventDispatcher;
}

declare module '@fastify/awilix' {
  interface Cradle extends AppCradle {}
}

const containerPluginCallback: FastifyPluginAsync = async (fastify) => {
  const diContainer: AwilixContainer<AppCradle> = createContainer({ injectionMode: 'PROXY' });

  diContainer.register(infraResolvers);
  diContainer.register(repoResolvers);
  diContainer.register(storeResolvers);
  diContainer.register(adapterResolvers);
  diContainer.register(serviceResolvers);
  diContainer.register(useCaseResolvers);
  // EventDispatcher must receive its `onError` at construction (the typed
  // constructor signature enforces it); we register the dispatcher as a value
  // built by an `asFunction` that captures fastify.log.
  diContainer.register({
    chatLoggingHandler: asClass(ChatLoggingHandler)
  });
  diContainer.register({
    repositories: repositoriesGrouping,
    stores: storesGrouping,
    adapters: adaptersGrouping,
    services: servicesGrouping,
    useCases: useCasesGrouping
  });
  diContainer.register({ sseHub: asValue(fastify.sseHub) });

  // Dev/test Google OAuth verifier (dev-only, refuses non-mock tokens in prod)
  const isDevMode = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';
  const mockGoogleVerifier = {
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
  };
  diContainer.register({ mockGoogleVerifier: asValue(mockGoogleVerifier) });

  // Connect dispatcher error logger (constructor-injected)
  const eventDispatcher = new EventDispatcher((eventName, err) => {
    fastify.log.error({ err, eventName }, 'Event handler failed');
  });
  diContainer.register({ eventDispatcher: asValue(eventDispatcher) });

  // The plugin's `FastifyPluginCallback<NonNullable<FastifyAwilixOptions>>`
  // types `container` as `AwilixContainer<Cradle>` (their Cradle); our
  // container is typed with the augmented `AppCradle` (structurally equal
  // but nominally distinct). The runtime accepts any container — only the
  // static type conflicts — so we narrow via the plugin's exported option
  // shape.
  await fastify.register(fastifyAwilixPlugin, {
    container: diContainer as never,
    disposeOnClose: true
  });

  // Wire SSE price/ops fetchers + news relay (lifecycle-aware via onClose).
  if (env.NODE_ENV !== 'test' && !process.env.VITEST) {
    const sseHub = fastify.sseHub as any;
    if (sseHub) {
      sseHub.setPriceFetcher(() => diContainer.cradle.repositories.marketDataRepo.getAllPrices());
      sseHub.setOpsFetcher(async () => {
        const c = diContainer.cradle;
        const source = env.OPS_SOURCE || 'cache';
        const metrics =
          source === 'cache'
            ? await c.repositories.analyticsRepo.getCachedSystemMetrics()
            : await c.useCases.getSystemMetricsUseCase.execute();
        const analytics =
          source === 'cache'
            ? await c.repositories.analyticsRepo.getUserAnalyticsCached()
            : await c.useCases.getAnalyticsUseCase.execute();
        return { metrics, analytics };
      });
    }
  }

  if (env.NODE_ENV !== 'test' && !process.env.VITEST) {
    const seenNewsIds = new Set<string>();
    let seenNewsPrimed = false;
    const newsRelayTimer = setInterval(async () => {
      if (!fastify.sseHub.hasClientsFor('news')) return;
      try {
        const latest = await diContainer.cradle.repositories.newsRepo.findRecent(25);
        if (!seenNewsPrimed) {
          for (const article of latest) seenNewsIds.add(article.id);
          seenNewsPrimed = true;
          return;
        }
        const fresh = latest.filter((a) => !seenNewsIds.has(a.id));
        for (const article of fresh.reverse()) {
          seenNewsIds.add(article.id);
          fastify.sseHub.broadcastNews(article.toJSON ? article.toJSON() : article);
        }
      } catch {}
    }, 15_000);
    fastify.addHook('onClose', async () => clearInterval(newsRelayTimer));
  }

  // Ops aggregator (60s leader-replica writer)
  if (env.NODE_ENV !== 'test' && !process.env.VITEST) {
    const aggMs = env.OPS_AGGREGATOR_INTERVAL_MS || 60_000;
    const aggTimer = setInterval(async () => {
      try {
        if (!fastify.sseHub?.hasClientsFor('ops')) return;
        const lockKey = redisKeys.opsLock('metrics');
        const got = await diContainer.cradle.redis.set(lockKey, String(Date.now()), {
          nx: true,
          px: Math.ceil(aggMs * 0.9)
        });
        if (got !== 'OK') return;
        const c = diContainer.cradle;
        const m = await c.useCases.getSystemMetricsUseCase.execute();
        await c.repositories.analyticsRepo.writeGauges(m);
        const a = await c.useCases.getAnalyticsUseCase.execute();
        await c.repositories.analyticsRepo.writeAnalyticsCache(a);
      } catch (err: any) {
        fastify.log.warn({ err: err.message }, '[OPS AGGREGATOR] snapshot failed');
      }
    }, aggMs);
    fastify.addHook('onClose', async () => clearInterval(aggTimer));
  }

  fastify.decorate('container', {
    repositories: diContainer.cradle.repositories,
    stores: diContainer.cradle.stores,
    adapters: diContainer.cradle.adapters,
    services: diContainer.cradle.services,
    useCases: diContainer.cradle.useCases,
    pgPool: diContainer.cradle.pgPool,
    db: diContainer.cradle.db,
    redis: diContainer.cradle.redis,
    eventDispatcher: diContainer.cradle.eventDispatcher
  } satisfies AppContainer);

  fastify.addHook('onClose', async () => {
    fastify.log.info('Closing PostgreSQL pool and disconnecting Redis...');
    await Promise.allSettled([diContainer.cradle.pgPool.end()]);
  });
};

const infraResolvers = {
  pgPool: asFunction(() => createPgPool(env.DATABASE_URL, 20)),
  db: asFunction(({ pgPool }: { pgPool: ReturnType<typeof createPgPool> }) =>
    createDrizzleClient(pgPool)
  ),
  moneyDb: asFunction(
    ({ pgPool, db }: { pgPool: ReturnType<typeof createPgPool>; db: DrizzleDb }) =>
      env.DATABASE_URL_MONEY ? createDrizzleClient(createPgPool(env.DATABASE_URL_MONEY, 6)) : db
  ),
  redis: asFunction(() =>
    createRedisClient(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)
  ),
  appConfig: asFunction(() => createAppConfig(env)),
  notifier: asFunction(
    ({ sseHub }: { sseHub: any }): INotifier => ({
      broadcastGlobal: (channel, _event, payload) => {
        if (channel === 'market') sseHub.broadcastMarketTick(payload);
        else if (channel === 'news') sseHub.broadcastNews(payload);
      },
      broadcastToUser: (userId, event, payload) => sseHub.broadcastToUser(userId, event, payload)
    })
  )
};

export const containerPlugin = fp(containerPluginCallback, { name: 'app-container' });
