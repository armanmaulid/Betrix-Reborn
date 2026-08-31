import WebSocket from 'ws';
import { logger as baseLogger } from '@betrix/application';
import { env } from '@betrix/config';
import {
  createPgPool,
  createDrizzleClient,
  DrizzleStreamSymbolRepository,
  createRedisClient,
  RedisMarketCacheStore,
  DrizzleWorkerStateRepository,
  RedisWorkerCommandBus
} from '@betrix/infra';
import { PriceTick } from '@betrix/domain';
import type { IManagedWorker, WorkerHealthSnapshot } from '@betrix/application';
import { ManagedWorkerBase } from './shared/ManagedWorkerBase.js';
import { backoffDelay } from './shared/retry.js';

const logger = baseLogger.child({ worker: 'finnhub-ws' });

const RELOAD_INTERVAL_MS = 60_000;
const MAX_CONCURRENT_SUBSCRIPTIONS = 45; // Finnhub free limit is 50

export class FinnhubWsWorker extends ManagedWorkerBase implements IManagedWorker {
  private ws: WebSocket | null = null;
  private isShuttingDown = false;
  private isPaused = false;
  private tickCount = 0;
  private errorCount = 0;
  private lastError: string | null = null;
  private subscribedSymbols = new Set<string>();
  private reloadTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempt = 0;
  private pool: ReturnType<typeof createPgPool>;
  private symbolRepo: DrizzleStreamSymbolRepository;
  private redis = createRedisClient(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
  private marketCache: RedisMarketCacheStore;
  private reverseMap: Record<string, string> = {}; // e.g. 'OANDA:EUR_USD' -> 'EURUSD'

  constructor(private readonly apiKey: string = env.FINNHUB_API_KEY) {
    const commandRedis = createRedisClient();
    const pool = createPgPool(env.DATABASE_URL, 5);
    const db = createDrizzleClient(pool);
    super(
      'finnhub-realtime-ws',
      new RedisWorkerCommandBus(commandRedis),
      new DrizzleWorkerStateRepository(db),
      logger
    );

    this.pool = pool;
    this.symbolRepo = new DrizzleStreamSymbolRepository(db);
    this.marketCache = new RedisMarketCacheStore(this.redis);
  }

  /** Load active streaming symbols from DB and build reverse mapping. */
  private async loadFinnhubSymbols(): Promise<string[]> {
    const rows = await this.symbolRepo.findActive();
    this.reverseMap = {};
    for (const r of rows) {
      this.reverseMap[r.finnhubSymbol] = r.symbol.toUpperCase();
    }

    if (rows.length > MAX_CONCURRENT_SUBSCRIPTIONS) {
      const skipped = rows.slice(MAX_CONCURRENT_SUBSCRIPTIONS).map((r) => r.symbol.toUpperCase());
      logger.warn(
        `${rows.length} active stream symbols exceed MAX_CONCURRENT_SUBSCRIPTIONS (${MAX_CONCURRENT_SUBSCRIPTIONS}) — ${skipped.length} symbol(s) will NOT receive live ticks: ${skipped.join(', ')}`
      );
    }

    return rows.slice(0, MAX_CONCURRENT_SUBSCRIPTIONS).map((r) => r.finnhubSymbol);
  }

  public async start(): Promise<void> {
    if (await this.wasDeliberatelyHalted()) {
      logger.info(
        'Finnhub WS Worker was previously paused/stopped by an admin — not auto-starting.'
      );
      return;
    }
    await this.runAsLeaderOrStandby();
  }

  protected async doStart(): Promise<void> {
    if (!this.apiKey) {
      logger.error('FINNHUB_API_KEY is not configured in .env. Worker idling...');
      return;
    }

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.isPaused = false;
    const url = `wss://ws.finnhub.io?token=${this.apiKey}`;
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      logger.info('Connected to Finnhub Live WebSocket Stream.');
      this.reconnectAttempt = 0;
      this.subscribedSymbols.clear();
      this.subscribeFromDb();
    });

    this.ws.on('message', async (rawData: WebSocket.RawData) => {
      try {
        const message = JSON.parse(rawData.toString());

        // Invariant 3: Reply to ping frames with pong
        if (message.type === 'ping') {
          this.ws?.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        // T6.2 — pong already answered above; NOW drop ticks while paused so
        // Finnhub never idle-closes us and silently self-resumes via reconnect.
        if (this.isPaused) return;

        if (message.type === 'trade' && Array.isArray(message.data)) {
          for (const trade of message.data) {
            this.tickCount++;
            const internalSymbol =
              this.reverseMap[trade.s] ||
              trade.s
                .replace('OANDA:', '')
                .replace('_', '')
                .replace('BINANCE:', '')
                .replace('USDT', 'USD');
            const price = Number(trade.p);
            const volume = Number(trade.v ?? 0);
            const timestamp = Number(trade.t ?? Date.now());

            const tick = new PriceTick({
              symbol: internalSymbol.toUpperCase(),
              bid: price,
              ask: price,
              spread: 0,
              volume,
              timestamp
            });

            // Cache price tick in Redis market cache store
            await this.marketCache.cachePrice(tick).catch((err) => {
              this.errorCount += 1;
              this.lastError = err.message;
              logger.error({ err: err.message }, 'Failed to cache price tick to Redis');
            });

            if (env.FINNHUB_LOG_TICKS) {
              logger.info(
                `[TICK] ${internalSymbol} (${trade.s}) @ ${trade.p} (vol: ${trade.v ?? 0}, time: ${new Date(Number(trade.t)).toISOString()})`
              );
            } else {
              logger.debug(
                `[TICK] ${internalSymbol} (${trade.s}) @ ${trade.p} (vol: ${trade.v ?? 0}, time: ${new Date(Number(trade.t)).toISOString()})`
              );
            }
          }
        }
      } catch (err: any) {
        this.errorCount += 1;
        this.lastError = err.message;
        logger.error({ err: err.message }, 'Failed to parse incoming WebSocket message');
      }
    });

    this.ws.on('close', (code: number, reason: Buffer) => {
      if (this.isShuttingDown) {
        logger.info('WebSocket closed cleanly for graceful shutdown.');
        return;
      }

      logger.warn(
        `Finnhub WebSocket closed (code: ${code}, reason: ${reason?.toString() || 'none'}). Scheduling reconnection...`
      );
      this.scheduleReconnect();
    });

    this.ws.on('error', (err: Error) => {
      this.errorCount += 1;
      this.lastError = err.message;
      logger.error({ err: err.message }, 'Finnhub WebSocket encountered an error');
    });

    // Hot reload: reconcile subscriptions against DB every N seconds
    if (!this.reloadTimer) {
      this.reloadTimer = setInterval(() => {
        this.reconcileSubscriptions().catch((err) => {
          logger.error({ err: err.message }, 'Failed to reconcile Finnhub subscriptions');
        });
      }, RELOAD_INTERVAL_MS);
    }

    this.attachCommandListener();
  }

  private scheduleReconnect(): void {
    if (this.isShuttingDown || this.reconnectTimer) return;
    this.reconnectAttempt++;
    const delay = backoffDelay(this.reconnectAttempt, 3000, 20000);
    logger.info(
      `Scheduling Finnhub WebSocket reconnect in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempt})...`
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isShuttingDown && !this.isPaused) {
        this.runAsLeaderOrStandby();
      }
    }, delay);
  }

  private async subscribeFromDb(): Promise<void> {
    try {
      const symbols = await this.loadFinnhubSymbols();
      this.subscribeSymbols(symbols);
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to load symbols from DB');
    }
  }

  private async reconcileSubscriptions(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const desired = await this.loadFinnhubSymbols();
    const desiredSet = new Set(desired);

    const toRemove = [...this.subscribedSymbols].filter((s) => !desiredSet.has(s));
    const toAdd = desired.filter((s) => !this.subscribedSymbols.has(s));

    for (const sym of toRemove) {
      logger.info(`Unsubscribing from Finnhub symbol: ${sym}`);
      try {
        this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol: sym }));
      } catch {
        // Socket already closed — deletion below is still required.
      }
      this.subscribedSymbols.delete(sym);
    }

    this.subscribeSymbols(toAdd);
  }

  private subscribeSymbols(symbols: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Stagger subscriptions with 20ms delays to avoid blasting WebSocket frame limits
    symbols.forEach((sym, index) => {
      if (this.subscribedSymbols.has(sym)) return;
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.subscribedSymbols.has(sym)) {
          logger.info(`Subscribing to Finnhub symbol: ${sym}`);
          try {
            this.ws.send(JSON.stringify({ type: 'subscribe', symbol: sym }));
            this.subscribedSymbols.add(sym);
          } catch (err: any) {
            logger.error({ err: err.message }, `Failed to send subscribe for ${sym}`);
          }
        }
      }, index * 25);
    });
  }

  /**
   * Keeps the WebSocket connection OPEN — unlike stop(), which fully closes
   * it — and merely stops processing incoming ticks (see the `isPaused` guard
   * in the 'message' handler above). This means resume() is instant with no
   * reconnect cost, at the price of continuing to receive (and discard)
   * frames from Finnhub while paused.
   */
  protected async doPause(): Promise<void> {
    this.isPaused = true;
    logger.info(
      'Finnhub WS Worker paused — connection stays open, incoming ticks are discarded until resumed.'
    );
  }

  protected async doStop(): Promise<void> {
    this.isShuttingDown = true;
    this.isPaused = false;
    if (this.reloadTimer) {
      clearInterval(this.reloadTimer);
      this.reloadTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      logger.info('Unsubscribing and closing Finnhub WebSocket...');
      for (const sym of this.subscribedSymbols) {
        try {
          this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol: sym }));
        } catch {
          // Ignore
        }
      }
      try {
        this.ws.close(1000, 'Worker shutdown');
      } catch {
        // Already closed — nothing to do.
      }
      this.ws = null;
    }
    this.detachCommandListener();
  }

  protected async doRestart(): Promise<void> {
    this.isShuttingDown = false;
    await this.doStop();
    this.isShuttingDown = false;
    await this.runAsLeaderOrStandby();
  }

  public getHealth(): WorkerHealthSnapshot {
    return {
      status: this.isPaused
        ? 'paused'
        : this.ws?.readyState === WebSocket.OPEN
          ? 'running'
          : 'stopped',
      processedCount: this.tickCount,
      errorCount: this.errorCount,
      lastError: this.lastError
    };
  }

  public async stop(): Promise<void> {
    await this.releaseLeaderLease();
    await this.doStop();
    await this.pool.end();
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
  process.argv[1]?.endsWith('ws-worker.ts') || process.argv[1]?.endsWith('ws-worker.js');
if (isDirectExecution) {
  const worker = new FinnhubWsWorker();

  const shutdown = async () => {
    logger.info('Received shutdown signal. Stopping Finnhub WS Worker...');
    await worker.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  worker.start().catch((err) => {
    logger.error(err, 'Failed to start Finnhub WS Worker');
    process.exit(1);
  });
}
