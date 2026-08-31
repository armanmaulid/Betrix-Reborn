import cron, { ScheduledTask } from 'node-cron';
import pino from 'pino';
import { setTimeout } from 'node:timers/promises';
import { env } from '@betrix/config';
import { BrokerTimeCalculator, type OHLCBar } from '@betrix/domain';
import {
  createPgPool,
  createDrizzleClient,
  createRedisClient,
  DrizzleSymbolRepository,
  DrizzleOhlcSymbolRepository,
  RedisMarketCacheStore,
  DukascopyHistoryClient,
  DukascopySymbolCatalog,
  DrizzleWorkerStateRepository,
  RedisWorkerCommandBus
} from '@betrix/infra';
import type { IManagedWorker, WorkerHealthSnapshot } from '@betrix/application';
import { ManagedWorkerBase } from './shared/ManagedWorkerBase.js';

const utcDateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' });
const logger = pino({
  level: env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

export class SyncWorker extends ManagedWorkerBase implements IManagedWorker {
  /**
   * Minutes after Broker Midnight Rollover before the D1 baseline sync fires.
   * Dukascopy needs real processing time after a D1 candle closes before it's
   * queryable — firing right at rollover risks reading the not-yet-published
   * candle and silently caching yesterday's-yesterday as today's baseline.
   * syncD1Baselines() also date-validates the returned bar and retries as a
   * safety net in case this delay still isn't enough on a slow day.
   */
  private static readonly D1_PUBLISH_DELAY_MINUTES = 8;
  private dailyCronJob: ScheduledTask | null = null;
  private weeklyCatalogCronJob: ScheduledTask | null = null;
  private isShuttingDown = false;
  private isPaused = false;
  private pool: ReturnType<typeof createPgPool>;
  private redis: ReturnType<typeof createRedisClient>;
  private catalogRepo: DrizzleSymbolRepository;
  private ohlcRepo: DrizzleOhlcSymbolRepository;
  private marketDataRepo: RedisMarketCacheStore;
  private dukascopy = new DukascopyHistoryClient();
  private processedCount = 0;
  private errorCount = 0;
  private lastError: string | null = null;

  constructor(private readonly brokerUtcOffset: number = env.BROKER_UTC_OFFSET) {
    const redis = createRedisClient();
    const pool = createPgPool(env.DATABASE_URL, 5);
    const db = createDrizzleClient(pool);
    super(
      'symbol-d1-sync-worker',
      new RedisWorkerCommandBus(redis),
      new DrizzleWorkerStateRepository(db),
      logger
    );

    this.pool = pool;
    this.redis = redis;
    this.catalogRepo = new DrizzleSymbolRepository(db);
    this.ohlcRepo = new DrizzleOhlcSymbolRepository(db);
    this.marketDataRepo = new RedisMarketCacheStore(this.redis);
  }

  /** Load active OHLC symbols from DB. */
  private async loadDukascopySymbols(): Promise<string[]> {
    const rows = await this.ohlcRepo.findActive();
    return rows.map((r) => r.dukascopySymbol);
  }

  public async start(): Promise<void> {
    if (await this.wasDeliberatelyHalted()) {
      logger.info('Sync Worker was previously paused/stopped by an admin — not auto-starting.');
      return;
    }
    await this.runAsLeaderOrStandby();
  }

  protected async doStart(): Promise<void> {
    const rolloverUtcHour = BrokerTimeCalculator.getBrokerRolloverUtcHour(this.brokerUtcOffset);
    // Publish delay is worker-specific stagger (3) plus a real buffer for
    // Dukascopy to actually publish the D1 candle that just closed at
    // rollover — see getBrokerRolloverCronExpression's doc comment.
    const cronExpr = BrokerTimeCalculator.getBrokerRolloverCronExpression(
      this.brokerUtcOffset,
      3,
      SyncWorker.D1_PUBLISH_DELAY_MINUTES
    );

    logger.info(
      `Starting Symbol & D1 Baseline Sync Worker (Broker Offset: UTC+${this.brokerUtcOffset}, Rollover: ${rolloverUtcHour}:00 UTC / 00:00 Broker Time)...`
    );
    this.isPaused = false;

    // 1. Initial Sync: Full Broker Symbol Catalog Sync
    await this.syncBrokerCatalog();

    // 2. Initial Sync: D1 Baseline prices
    await this.syncD1Baselines();

    // 3. Schedule Daily D1 Baseline Sync at exact Broker Midnight Rollover (ADR-47)
    this.dailyCronJob = cron.schedule(
      cronExpr,
      async () => {
        if (this.isPaused) return;
        logger.info(
          `[CRON] Executing Daily D1 Baseline Sync at Broker Midnight Rollover (${rolloverUtcHour}:00 UTC / 00:00 Broker Time)...`
        );
        await this.syncD1Baselines();
      },
      { timezone: 'UTC' }
    );

    // 4. Schedule Weekly Full Broker Symbol Catalog Sync (Every Sunday at 20:00 UTC before market open)
    this.weeklyCatalogCronJob = cron.schedule(
      '0 20 * * 0',
      async () => {
        if (this.isPaused) return;
        logger.info('[CRON] Executing Weekly Full Broker Symbol Catalog Synchronization...');
        await this.syncBrokerCatalog();
      },
      { timezone: 'UTC' }
    );

    this.attachCommandListener();
    logger.info(
      `D1 Baseline Sync Worker scheduled dynamically (Daily cron: '${cronExpr}', Weekly Catalog cron: '0 20 * * 0').`
    );
  }

  /**
   * Synchronizes all 1,499+ Dukascopy broker instruments into PostgreSQL symbols table.
   */
  public async syncBrokerCatalog(): Promise<void> {
    try {
      logger.info('Auditing and synchronizing Broker Symbol Catalog with database...');
      const result = await DukascopySymbolCatalog.syncCatalogWithDatabase(this.catalogRepo);
      this.processedCount += result.newSymbolsInserted;
      logger.info(
        `[BROKER CATALOG SYNC] Synchronized ${result.totalBrokerSymbols} total broker instruments (New Inserted: ${result.newSymbolsInserted}, Existing in DB: ${result.existingSymbolsCount}).`
      );
    } catch (err: any) {
      this.errorCount += 1;
      this.lastError = err.message;
      logger.error(
        { err: err.message },
        'Failed to synchronize Broker Symbol Catalog with database'
      );
    }
  }

  public async syncD1Baselines(): Promise<void> {
    const ttlToNextRollover = BrokerTimeCalculator.calculateTtlToNextBrokerRollover(
      this.brokerUtcOffset,
      60,
      new Date(),
      SyncWorker.D1_PUBLISH_DELAY_MINUTES
    );

    const symbols = await this.loadDukascopySymbols();
    logger.info(
      `Synchronizing D1 open baselines across ${symbols.length} active symbols (Dynamic Redis TTL: ${ttlToNextRollover}s / ${(ttlToNextRollover / 3600).toFixed(1)}h)...`
    );

    for (const sym of symbols) {
      try {
        // Dukascopy is the single source of truth (SSOT) for D1 baselines.
        // No fallback: if it fails, surface the error instead of caching stale data.
        const d1Bar = await this.fetchValidatedD1Bar(sym);

        // Cache D1 bar in Redis strictly for 24h change calculation (ADR-27 & ADR-47).
        // Its .close (previous daily close) is used as the baseline for "today's" %
        // change — matches the industry-standard "current - previous close" convention,
        // and is much closer to "24h ago" than .open (which can be 24-48h stale
        // depending on time of day). See GetPricesUseCase for the read side.
        await this.marketDataRepo.cacheOHLC(sym, 'd1', [d1Bar], ttlToNextRollover);
        this.processedCount += 1;
        logger.info(
          `[D1 SYNC] ${sym} baseline (prev close) cached: ${d1Bar.close} (open: ${d1Bar.open}) [TTL: ${ttlToNextRollover}s]`
        );
      } catch (err: any) {
        this.errorCount += 1;
        this.lastError = err.message;
        logger.error(`Failed to sync D1 baseline for ${sym}: ${err.message}`);
      }
    }

    logger.info('D1 Baseline Synchronization completed.');
  }

  /**
   * Fetches the D1 bar for `sym` and validates it actually represents
   * yesterday's broker-date candle before returning it.
   *
   * Why this exists: Dukascopy needs processing time after a D1 candle
   * closes before it's queryable. If the sync runs before that candle is
   * published, fetchHistory's date range still returns *something* — just
   * with the not-yet-published candle missing, so the last bar in the
   * response silently becomes the day before instead. The publish-delay cron
   * buffer (SyncWorker.D1_PUBLISH_DELAY_MINUTES) makes this rare, but a slow
   * publish on Dukascopy's side can still outlast that buffer, so this is
   * the safety net: check the date, retry with backoff if it's wrong, and
   * only give up (surfacing an error instead of caching wrong data) after
   * exhausting retries.
   */
  private async fetchValidatedD1Bar(sym: string): Promise<OHLCBar> {
    const maxAttempts = 4;
    const retryDelayMs = 30_000;

    // The calendar day the D1 baseline is supposed to represent, in
    // broker-local terms. Normally "yesterday" — but Dukascopy (like the
    // broker) publishes no D1 candle for Saturday or Sunday, since the
    // market is closed. So if "yesterday" lands on a weekend day, the last
    // candle that actually exists is Friday's, and that's what
    // fetchHistory's own weekend snapping (see DukascopyHistoryClient) will
    // return. Expecting a weekend date here would mean this never matches
    // and burns through every retry for a candle that structurally can't
    // exist — so we snap the expectation to Friday the same way.
    const expectedBrokerDate = BrokerTimeCalculator.getBrokerDate(new Date(), this.brokerUtcOffset);
    expectedBrokerDate.setUTCDate(expectedBrokerDate.getUTCDate() - 1);
    const expectedDayOfWeek = expectedBrokerDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
    if (expectedDayOfWeek === 6) {
      expectedBrokerDate.setUTCDate(expectedBrokerDate.getUTCDate() - 1); // Sat -> Fri
    } else if (expectedDayOfWeek === 0) {
      expectedBrokerDate.setUTCDate(expectedBrokerDate.getUTCDate() - 2); // Sun -> Fri
    }
    const expectedKey = utcDateKey.format(expectedBrokerDate); // YYYY-MM-DD

    let lastBarKey = '';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const now = new Date();
      const lookback = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const bars = await this.dukascopy.fetchHistory(sym, 'd1', lookback, now);
      const d1Bar = bars[bars.length - 1];

      if (!d1Bar) {
        throw new Error(`No D1 bar returned for ${sym}`);
      }

      const barBrokerDate = BrokerTimeCalculator.getBrokerDate(
        new Date(d1Bar.time * 1000),
        this.brokerUtcOffset
      );
      const barKey = utcDateKey.format(barBrokerDate);

      if (barKey === expectedKey) {
        return d1Bar;
      }

      lastBarKey = barKey;

      if (attempt < maxAttempts) {
        logger.warn(
          `[D1 SYNC] ${sym} returned bar dated ${barKey}, expected ${expectedKey} (Dukascopy likely hasn't published yet) — retrying in ${retryDelayMs / 1000}s (attempt ${attempt}/${maxAttempts})...`
        );
        await setTimeout(retryDelayMs);
      }
    }

    // Exhausted retries — surface a clear error rather than silently caching
    // a bar dated earlier than expected as if it were yesterday's baseline.
    throw new Error(
      `D1 bar for ${sym} still dated ${lastBarKey} after ${maxAttempts} attempts, expected ${expectedKey} — Dukascopy has not published yesterday's candle yet`
    );
  }

  /**
   * No persistent connection to keep alive here — pause() means "skip
   * scheduled cron executions until resumed", same semantics as CleanupWorker.
   */
  protected async doPause(): Promise<void> {
    this.isPaused = true;
    logger.info('Sync Worker paused — scheduled runs will be skipped until resumed.');
  }

  protected async doStop(): Promise<void> {
    this.isPaused = false;
    if (this.dailyCronJob) {
      this.dailyCronJob.stop();
      this.dailyCronJob = null;
    }
    if (this.weeklyCatalogCronJob) {
      this.weeklyCatalogCronJob.stop();
      this.weeklyCatalogCronJob = null;
    }
    this.detachCommandListener();
    logger.info('Sync Worker cron jobs stopped.');
  }

  protected async doRestart(): Promise<void> {
    await this.doStop();
    await this.doStart();
  }

  public getHealth(): WorkerHealthSnapshot {
    return {
      status: this.isPaused ? 'paused' : this.dailyCronJob ? 'running' : 'stopped',
      processedCount: this.processedCount,
      errorCount: this.errorCount,
      lastError: this.lastError
    };
  }

  public async stop(): Promise<void> {
    this.isShuttingDown = true;
    await this.releaseLeaderLease();
    await this.doStop();
    await this.pool.end();
    logger.info('Sync Worker stopped cleanly.');
  }

  public async restart(): Promise<void> {
    await this.doRestart();
  }

  public async pause(): Promise<void> {
    await this.doPause();
  }
}

// Direct CLI entrypoint execution
const isDirectExecution =
  process.argv[1]?.endsWith('sync-worker.ts') || process.argv[1]?.endsWith('sync-worker.js');
if (isDirectExecution) {
  const worker = new SyncWorker();

  const shutdown = async () => {
    logger.info('Received shutdown signal. Stopping Sync Worker...');
    await worker.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  worker.start().catch((err) => {
    logger.error(err, 'Failed to start Sync Worker');
    process.exit(1);
  });
}
