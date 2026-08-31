import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { fastifyAwilixPlugin, type Cradle } from '@fastify/awilix';
import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  type AwilixContainer,
  type InferCradleFromResolvers,
  type Resolver
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
  CaptchaService,
  MarketDataService,
  NewsService,
  ContextInjectionService,
  WorkerManagerService,
  IWorkerCommandPublisher,
  ChatLoggingHandler
} from '@betrix/application';
import * as UC from '@betrix/application';
import { EventDispatcher, INotifier } from '@betrix/domain';

declare module 'fastify' {
  interface FastifyInstance {
    container: AppContainer;
  }
}

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
    ({
      workerCommandBus
    }: {
      workerCommandBus: RedisWorkerCommandBus;
    }): IWorkerCommandPublisher => ({
      async publishCommand(workerId, action, adminId) {
        await workerCommandBus.publishCommand(workerId, { action, adminId, timestamp: Date.now() });
      }
    })
  )
};
type AdapterCradle = InferCradleFromResolvers<typeof adapterResolvers>;

const serviceResolvers = {
  captchaService: asClass(CaptchaService),
  marketDataService: asClass(MarketDataService),
  newsService: asClass(NewsService),
  contextInjectionService: asClass(ContextInjectionService),
  workerManagerService: asClass(WorkerManagerService)
};
type ServiceCradle = InferCradleFromResolvers<typeof serviceResolvers>;

const useCaseResolvers = {
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

const pickGroup = <R extends Record<string, Resolver<any>>>(source: R) =>
  asFunction(
    (c: InferCradleFromResolvers<R>) =>
      Object.fromEntries(
        Object.keys(source).map((k) => [k, c[k as keyof InferCradleFromResolvers<R>]])
      ) as InferCradleFromResolvers<R>
  );

const repositoriesGrouping = pickGroup(repoResolvers);
const storesGrouping = pickGroup(storeResolvers);
const adaptersGrouping = pickGroup(adapterResolvers);
const servicesGrouping = pickGroup(serviceResolvers);
const useCasesGrouping = pickGroup(useCaseResolvers);

type AppCradle = InferCradleFromResolvers<typeof repoResolvers> &
  InferCradleFromResolvers<typeof storeResolvers> &
  InferCradleFromResolvers<typeof adapterResolvers> &
  InferCradleFromResolvers<typeof serviceResolvers> &
  InferCradleFromResolvers<typeof useCaseResolvers> & {
    pgPool: ReturnType<typeof createPgPool>;
    db: DrizzleDb;
    moneyPgPool: ReturnType<typeof createPgPool> | undefined;
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

type AppContainer = Pick<
  AppCradle,
  | 'repositories'
  | 'stores'
  | 'adapters'
  | 'services'
  | 'useCases'
  | 'pgPool'
  | 'db'
  | 'moneyPgPool'
  | 'redis'
  | 'eventDispatcher'
>;

declare module '@fastify/awilix' {
  // @fastify/awilix auto-injects our resolvers into FastifyRequest.diScope
  // via `InferCradleFromResolvers<typeof repoResolvers>`. The empty augmentation
  // here was suppressed (it produced an `interface Cradle` identical to the
  // base, which ESLint's `no-empty-object-type` flags). `AppCradle` is the
  // authoritative type used below.
  interface Cradle extends AppCradle {} // eslint-disable-line @typescript-eslint/no-empty-object-type
}

const containerPluginCallback: FastifyPluginAsync = async (fastify) => {
  const diContainer: AwilixContainer<AppCradle> = createContainer({ injectionMode: 'PROXY' });
  const isNotTest = () => env.NODE_ENV !== 'test' && !process.env.VITEST;

  diContainer.register(infraResolvers);
  diContainer.register(repoResolvers);
  diContainer.register(storeResolvers);
  diContainer.register(adapterResolvers);
  diContainer.register(serviceResolvers);
  diContainer.register(useCaseResolvers);
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

  const eventDispatcher = new EventDispatcher((eventName, err) => {
    fastify.log.error({ err, eventName }, 'Event handler failed');
  });
  diContainer.register({ eventDispatcher: asValue(eventDispatcher) });

  await fastify.register(fastifyAwilixPlugin, {
    container: diContainer as unknown as AwilixContainer<Cradle>,
    disposeOnClose: true
  });

  if (!isNotTest()) {
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

  if (isNotTest()) {
    // P16 — news relay uses a `datetime` watermark (Unix seconds) + `newsRepo.findSince()`
    // instead of an unbounded `Set<string>` of seen IDs (which leaked memory
    // on long-running replicas). One row read per tick, watermark advances.
    let newsWatermark = 0;
    const newsRelayTimer = setInterval(async () => {
      if (!fastify.sseHub.hasClientsFor('news')) return;
      try {
        const fresh = await diContainer.cradle.repositories.newsRepo.findSince(newsWatermark, 25);
        if (fresh.length > 0) {
          newsWatermark = fresh[fresh.length - 1].datetime;
          for (const article of fresh) {
            fastify.sseHub.broadcastNews(article.toJSON ? article.toJSON() : article);
          }
        }
      } catch {
        // SSE news-relay is best-effort; errors are logged elsewhere.
      }
    }, 15_000);
    fastify.addHook('onClose', async () => clearInterval(newsRelayTimer));
  }

  if (isNotTest()) {
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

  const c = diContainer.cradle;
  fastify.decorate('container', {
    repositories: c.repositories,
    stores: c.stores,
    adapters: c.adapters,
    services: c.services,
    useCases: c.useCases,
    pgPool: c.pgPool,
    db: c.db,
    moneyPgPool: c.moneyPgPool,
    redis: c.redis,
    eventDispatcher: c.eventDispatcher
  } satisfies AppContainer);

  fastify.addHook('onClose', async () => {
    fastify.log.info('Closing PostgreSQL pools and disconnecting Redis...');
    // D-3 — close the (optional) money pool too. pgPool.end() drains in-flight
    // queries before resolving; preClose would race with handlers still
    // resolving. onClose is the right hook.
    const closers: Promise<unknown>[] = [diContainer.cradle.pgPool.end()];
    if (diContainer.cradle.moneyPgPool) {
      closers.push(diContainer.cradle.moneyPgPool.end());
    }
    await Promise.allSettled(closers);
  });
};

const infraResolvers = {
  pgPool: asFunction(() => createPgPool(env.DATABASE_URL, 20)),
  db: asFunction(({ pgPool }: { pgPool: ReturnType<typeof createPgPool> }) =>
    createDrizzleClient(pgPool)
  ),
  // D-3 — moneyDb pool split into moneyPgPool + moneyDb so the pool
  // can be .end()-ed in onClose. When DATABASE_URL_MONEY is unset,
  // moneyPgPool is undefined, moneyDb falls back to the primary pool,
  // and we skip end() in shutdown (the primary pool already closes).
  moneyPgPool: asFunction((): ReturnType<typeof createPgPool> | undefined =>
    env.DATABASE_URL_MONEY ? createPgPool(env.DATABASE_URL_MONEY, 6) : undefined
  ),
  moneyDb: asFunction(
    ({
      moneyPgPool,
      db
    }: {
      moneyPgPool: ReturnType<typeof createPgPool> | undefined;
      db: DrizzleDb;
    }) => (moneyPgPool ? createDrizzleClient(moneyPgPool) : db)
  ),
  redis: asFunction(() =>
    createRedisClient(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)
  ),
  appConfig: asFunction(() => createAppConfig(env)),
  notifier: asFunction(({ sseHub }: { sseHub: any }): INotifier => ({
    broadcastGlobal: (channel, _event, payload) => {
      if (channel === 'market') sseHub.broadcastMarketTick(payload);
      else if (channel === 'news') sseHub.broadcastNews(payload);
    },
    broadcastToUser: (userId, event, payload) => sseHub.broadcastToUser(userId, event, payload)
  }))
};

export const containerPlugin = fp(containerPluginCallback, { name: 'app-container' });
