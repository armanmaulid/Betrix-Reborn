import WebSocket from 'ws';
import pino from 'pino';
import { env } from '@betrix/config';
import { createPgPool, createDrizzleClient, DrizzleStreamSymbolRepository } from '@betrix/infra';

const logger = pino({
  level: env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

const RELOAD_INTERVAL_MS = 60_000;

export class FinnhubWsWorker {
  private ws: WebSocket | null = null;
  private isShuttingDown = false;
  private tickCount = 0;
  private subscribedSymbols = new Set<string>();
  private reloadTimer: NodeJS.Timeout | null = null;
  private pool = createPgPool(env.DATABASE_URL, 5);
  private symbolRepo: DrizzleStreamSymbolRepository;

  constructor(private readonly apiKey: string = env.FINNHUB_API_KEY) {
    const db = createDrizzleClient(this.pool);
    this.symbolRepo = new DrizzleStreamSymbolRepository(db);
  }

  /** Load active streaming symbols from DB. */
  private async loadFinnhubSymbols(): Promise<string[]> {
    const rows = await this.symbolRepo.findActive();
    return rows.map((r) => r.finnhubSymbol);
  }

  public async start(): Promise<void> {
    if (!this.apiKey) {
      logger.error('FINNHUB_API_KEY is not configured in .env. Exiting...');
      process.exit(1);
    }

    const url = `wss://ws.finnhub.io?token=${this.apiKey}`;
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      logger.info(' Connected to Finnhub Live WebSocket Stream.');
      this.subscribeFromDb();
    });

    this.ws.on('message', (rawData: WebSocket.RawData) => {
      try {
        const message = JSON.parse(rawData.toString());

        // Invariant 3: Reply to ping frames with pong
        if (message.type === 'ping') {
          this.ws?.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if (message.type === 'trade' && Array.isArray(message.data)) {
          for (const trade of message.data) {
            this.tickCount++;

            if (env.FINNHUB_LOG_TICKS) {
              logger.info(
                `[TICK] ${trade.s} @ ${trade.p} (vol: ${trade.v ?? 0}, time: ${new Date(Number(trade.t)).toISOString()})`
              );
            } else {
              logger.debug(
                `[TICK] ${trade.s} @ ${trade.p} (vol: ${trade.v ?? 0}, time: ${new Date(Number(trade.t)).toISOString()})`
              );
            }
          }
        }
      } catch (err: any) {
        logger.error({ err: err.message }, 'Failed to parse incoming WebSocket message');
      }
    });

    this.ws.on('close', (code: number, reason: Buffer) => {
      if (this.isShuttingDown) {
        logger.info('WebSocket closed cleanly for graceful shutdown.');
        return;
      }

      logger.warn(`Finnhub WebSocket closed unexpectedly (code: ${code}, reason: ${reason.toString()}).`);
      // Fail-fast process isolation (ADR-44): Exit 1 so supervisor/PM restarts this worker individually
      logger.error('Exiting process with code 1 for external process manager restart...');
      process.exit(1);
    });

    this.ws.on('error', (err: Error) => {
      logger.error({ err: err.message }, 'Finnhub WebSocket encountered an error');
      if (!this.isShuttingDown) {
        logger.error('Fatal WebSocket error. Exiting process with code 1...');
        process.exit(1);
      }
    });

    // Hot reload: reconcile subscriptions against DB every N seconds so adding/removing
    // symbols in the database takes effect without restarting the worker.
    this.reloadTimer = setInterval(() => {
      this.reconcileSubscriptions().catch((err) => {
        logger.error({ err: err.message }, 'Failed to reconcile Finnhub subscriptions');
      });
    }, RELOAD_INTERVAL_MS);
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
      this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol: sym }));
      this.subscribedSymbols.delete(sym);
    }

    this.subscribeSymbols(toAdd);
  }

  private subscribeSymbols(symbols: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    for (const sym of symbols) {
      if (this.subscribedSymbols.has(sym)) continue;
      logger.info(`Subscribing to Finnhub symbol: ${sym}`);
      this.ws.send(JSON.stringify({ type: 'subscribe', symbol: sym }));
      this.subscribedSymbols.add(sym);
    }
  }

  public async stop(): Promise<void> {
    this.isShuttingDown = true;
    if (this.reloadTimer) {
      clearInterval(this.reloadTimer);
      this.reloadTimer = null;
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
      this.ws.close(1000, 'Worker shutdown');
      this.ws = null;
    }
    await this.pool.end();
  }
}

// Direct CLI entrypoint execution
const isDirectExecution = process.argv[1]?.endsWith('ws-worker.ts') || process.argv[1]?.endsWith('ws-worker.js');
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
