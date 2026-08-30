// Persistence - Drizzle PG
export * from './persistence/drizzle/schema.js';
export * from './persistence/drizzle/client.js';
export * from './persistence/drizzle/migrate.js';
export * from './persistence/drizzle/seed.js';
export { runD1Backfill } from './persistence/drizzle/d1-backfill-accounts.js';
export { sql } from 'drizzle-orm';
export * from './auth/index.js';

// Repositories - PG
export * from './persistence/pg/DrizzleUserRepository.js';
export * from './persistence/pg/DrizzleSessionRepository.js';
export * from './persistence/pg/DrizzleDeviceRepository.js';
export * from './persistence/pg/DrizzleChatRepository.js';
export * from './persistence/pg/DrizzleCreditRepository.js';
export * from './persistence/pg/DrizzleSymbolRepository.js';
export * from './persistence/pg/DrizzleStreamSymbolRepository.js';
export * from './persistence/pg/DrizzleOhlcSymbolRepository.js';
export * from './persistence/pg/DrizzleNewsRepository.js';
export * from './persistence/pg/DrizzleMessageRepository.js';
export * from './persistence/pg/DrizzleAdminRepositories.js';
export * from './persistence/pg/DrizzleAuthRepositories.js';
export * from './persistence/pg/DrizzleVoucherRepository.js';
export * from './persistence/pg/DrizzleAiAgentRepository.js';
export * from './persistence/pg/DrizzleCalendarRepository.js';
export * from './persistence/pg/DrizzleMarketDataRepositories.js';
export * from './messaging/RedisWorkerCommandBus.js';

// Persistence - Redis
export * from './persistence/redis/RedisClient.js';
export {
  RedisMarketCacheStore,
  RedisMarketCacheStore as RedisMarketDataRepository
} from './persistence/redis/RedisMarketDataRepository.js';
export * from './persistence/redis/RedisEphemeralStores.js';
export * from './persistence/redis/redis-keys.js';

// External Adapters
export * from './external/finnhub/FinnhubRealtimeClient.js';
export * from './external/finnhub/FinnhubNewsAdapter.js';
export * from './external/dukascopy/DukascopyHistoryClient.js';
export * from './external/dukascopy/DukascopySymbolCatalog.js';
export * from './external/market/CachedMarketDataProvider.js';
export * from './external/ai/AiGatewayClient.js';
export * from './external/email/SmtpEmailService.js';
export * from './external/fxmacrodata/FxMacroDataClient.js';
