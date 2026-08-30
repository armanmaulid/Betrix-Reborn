import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import pino from 'pino';
import { PriceTick, NewsArticle } from '@betrix/domain';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export interface SseClient {
  id: string;
  userId: string;
  channel: 'market' | 'news' | 'ops';
  reply: FastifyReply;
  symbols?: Set<string>;
  connectedAt: Date;
}

export interface OpsSnapshot {
  metrics: unknown;
  analytics: unknown;
}

export class SseHub {
  private clients = new Map<string, SseClient>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private marketTimer: NodeJS.Timeout | null = null;
  // Guards the recursive setTimeout chain in scheduleMarketTick/runMarketTick.
  // Without this, a tick already in flight when closeAll() runs (e.g. still
  // awaiting priceFetcher()) finishes AFTER closeAll() has cleared
  // this.marketTimer, and its trailing scheduleMarketTick() call arms a new
  // timer that nothing ever clears again — that live timer keeps the Node
  // event loop non-empty, so Fastify's app.close() (awaited in server.ts's
  // SIGINT/SIGTERM handler before process.exit(0)) never resolves and the
  // process hangs until something force-kills it.
  private isShuttingDown = false;
  private marketDelayMs = Number(process.env.MARKET_TICKER_INTERVAL_MS) || 5000;
  private static readonly MARKET_MAX_DELAY_MS = 30_000;
  private lastPriceSnapshot = new Map<string, number>();
  private priceFetcher: (() => Promise<PriceTick[]>) | null = null;
  private opsTickerTimer: NodeJS.Timeout | null = null;
  private opsFetcher: (() => Promise<OpsSnapshot>) | null = null;

  /** T2.5 — daily Upstash command budget for the SSE tickers (fail-safe). */
  private redisBudgetUsedToday = 0;
  private budgetDayUtc = new Date().getUTCDate();
  private budgetWarnedAt = 0;

  constructor() {
    this.startHeartbeat();
  }

  public setPriceFetcher(fetcher: () => Promise<PriceTick[]>): void {
    this.priceFetcher = fetcher;
    this.startMarketTicker();
  }

  /**
   * Ops ticker (dashboard): pushes a full metrics+analytics snapshot to every
   * connected admin 'ops' client on a fixed interval. The fetcher only runs
   * while at least one ops client is attached — zero DB load when no
   * dashboard is open.
   */
  public setOpsFetcher(fetcher: () => Promise<OpsSnapshot>): void {
    this.opsFetcher = fetcher;
    this.startOpsTicker();
  }

  private startOpsTicker(): void {
    if (this.opsTickerTimer) return;

    this.opsTickerTimer = setInterval(async () => {
      if (!this.opsFetcher || this.clients.size === 0) return;

      let hasOpsClient = false;
      for (const client of this.clients.values()) {
        if (client.channel === 'ops') {
          hasOpsClient = true;
          break;
        }
      }
      if (!hasOpsClient) return;

      try {
        const snapshot = await this.opsFetcher();
        this.broadcastOps(snapshot);
      } catch {
        // Ignore background snapshot errors — the next tick retries.
      }
    }, 10_000); // 10s push cadence (was 15s client polling, now flicker-free)
  }

  public broadcastOps(snapshot: OpsSnapshot): void {
    for (const client of this.clients.values()) {
      if (client.channel !== 'ops') continue;
      this.sendEvent(client, 'ops', snapshot);
    }
  }

  public addClient(
    id: string,
    userId: string,
    channel: 'market' | 'news' | 'ops',
    request: FastifyRequest,
    reply: FastifyReply,
    symbols?: string[]
  ): void {
    // Reject new connections once shutdown has begun. Without this, a
    // client reconnecting in the window between SIGINT and the process
    // actually exiting (e.g. its old connection was just severed by
    // closeAll()'s reply.raw.end() below, or a plain network blip) can
    // still reach here and register in this.clients — after closeAll()
    // already ran once, so nothing will ever clean it up. An open SSE
    // response (writeHead(200, ...) with no matching .end()) keeps Node's
    // http.Server tracking it as an active connection, which is exactly
    // what makes Fastify's app.close() (awaited in server.ts before
    // process.exit(0)) hang indefinitely — the same end result as the
    // marketTimer race condition, but from a different cause: a
    // never-ending connection instead of a never-cleared timer.
    if (this.isShuttingDown) {
      reply.raw.writeHead(503, { 'Content-Type': 'application/json' });
      reply.raw.end(JSON.stringify({ error: 'Server is shutting down' }));
      return;
    }

    // Set standard SSE Headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    const client: SseClient = {
      id,
      userId,
      channel,
      reply,
      symbols:
        symbols && symbols.length > 0 ? new Set(symbols.map((s) => s.toUpperCase())) : undefined,
      connectedAt: new Date()
    };

    this.clients.set(id, client);

    // Initial handshake event
    this.sendEvent(client, 'connected', {
      clientId: id,
      channel,
      symbols: symbols || 'ALL',
      timestamp: Date.now()
    });

    // Cleanup on disconnect
    request.raw.on('close', () => {
      this.removeClient(id);
    });
    // CRITICAL: socket errors (EPIPE / write-after-end) are emitted
    // ASYNCHRONOUSLY — a synchronous try/catch around res.write() never sees
    // them. Without this listener a burst of disconnects during broadcast can
    // crash the whole process with an unhandled 'error' event.
    reply.raw.on('error', () => {
      this.removeClient(id);
    });
  }

  public removeClient(id: string): void {
    const client = this.clients.get(id);
    if (client) {
      try {
        client.reply.raw.end();
      } catch {
        // ignore if already closed
      }
      this.clients.delete(id);
    }
  }

  public broadcastMarketTick(tick: PriceTick | any): void {
    const symbol = (tick.symbol || '').toUpperCase();
    const payload = tick.toJSON ? tick.toJSON() : tick;

    for (const client of this.clients.values()) {
      if (client.channel !== 'market') continue;

      if (!client.symbols || client.symbols.has(symbol)) {
        this.sendEvent(client, 'tick', payload);
      }
    }
  }

  public broadcastNews(article: NewsArticle | any): void {
    const payload = article.toJSON ? article.toJSON() : article;

    for (const client of this.clients.values()) {
      if (client.channel !== 'news') continue;
      this.sendEvent(client, 'news', payload);
    }
  }

  public broadcastToUser(userId: string, event: string, data: unknown): void {
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        this.sendEvent(client, event, data);
      }
    }
  }

  public closeAll(): void {
    // Set first, before anything else: any tick already mid-flight (past
    // this check, blocked in an await) will still run to completion, but
    // its final scheduleMarketTick() call at the end will see this flag and
    // no-op instead of arming a new, never-cleared timer. See the field's
    // doc comment above for why that matters.
    this.isShuttingDown = true;

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.marketTimer) {
      clearTimeout(this.marketTimer);
      this.marketTimer = null;
    }

    if (this.opsTickerTimer) {
      clearInterval(this.opsTickerTimer);
      this.opsTickerTimer = null;
    }

    for (const client of this.clients.values()) {
      try {
        this.sendEvent(client, 'close', { message: 'Server shutting down' });
        client.reply.raw.end();
      } catch {
        // ignore
      }
    }
    this.clients.clear();
  }

  public getConnectedCount(): number {
    return this.clients.size;
  }

  /** True when at least one client sits on the given channel (ticker gating). */
  public hasClientsFor(channel: 'market' | 'news' | 'ops'): boolean {
    for (const client of this.clients.values()) {
      if (client.channel === channel) return true;
    }
    return false;
  }

  private sendEvent(client: SseClient, event: string, data: unknown): void {
    try {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
      const writable = client.reply.raw;
      // write() returning false means the kernel buffer is full — the client
      // is too slow (or already gone). Drop it instead of buffering without
      // bound and building memory pressure on the process.
      if (writable.destroyed || writable.writableEnded) {
        this.removeClient(client.id);
        return;
      }
      const ok = writable.write(`event: ${event}\ndata: ${dataStr}\n\n`);
      if (!ok) {
        this.removeClient(client.id);
      }
    } catch {
      this.removeClient(client.id);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      for (const client of this.clients.values()) {
        try {
          const writable = client.reply.raw;
          if (writable.destroyed || writable.writableEnded) {
            this.removeClient(client.id);
            continue;
          }
          const ok = writable.write(`event: ping\ndata: ${Date.now()}\n\n`);
          if (!ok) this.removeClient(client.id);
        } catch {
          this.removeClient(client.id);
        }
      }
    }, 25000); // 25s heartbeat
  }

  /**
   * T2.5 — adaptive market ticker replacing the fixed 1s setInterval that
   * alone burned ~86k Upstash ops/day (≈8.7× the free tier).
   *  - Base cadence MARKET_TICKER_INTERVAL_MS (5s), idle backoff ×2 up to 30s,
   *    instant reset to base on any real change or fresh client attach.
   *  - Every HGETALL consumes from REDIS_DAILY_BUDGET; exhausted → skip ticks
   *    with an hourly warning instead of hammering the provider.
   */
  private consumeRedisBudget(calls = 1): boolean {
    const todayUtc = new Date().getUTCDate();
    if (todayUtc !== this.budgetDayUtc) {
      this.budgetDayUtc = todayUtc;
      this.redisBudgetUsedToday = 0;
      this.budgetWarnedAt = 0;
    }
    const budget = Number(process.env.REDIS_DAILY_BUDGET) || 6000;
    if (this.redisBudgetUsedToday + calls > budget) return false;
    this.redisBudgetUsedToday += calls;
    return true;
  }

  private startMarketTicker(): void {
    if (this.marketTimer) return;
    this.scheduleMarketTick();
  }

  private scheduleMarketTick(delayMs = this.marketDelayMs): void {
    if (this.marketTimer || this.isShuttingDown) return;
    this.marketTimer = setTimeout(() => {
      this.marketTimer = null;
      void this.runMarketTick();
    }, delayMs);
  }

  private async runMarketTick(): Promise<void> {
    if (!this.priceFetcher || !this.hasClientsFor('market')) {
      // Idle — retry at base cadence so a newly attached client is served fast.
      this.marketDelayMs = Number(process.env.MARKET_TICKER_INTERVAL_MS) || 5000;
      this.scheduleMarketTick();
      return;
    }

    if (!this.consumeRedisBudget(1)) {
      if (Date.now() - this.budgetWarnedAt > 3_600_000) {
        this.budgetWarnedAt = Date.now();
        logger.warn(
          `[MARKET TICKER] Daily Redis budget exhausted (${process.env.REDIS_DAILY_BUDGET || 6000}) — pausing price pushes until UTC midnight.`
        );
      }
      this.scheduleMarketTick(60_000);
      return;
    }

    let changed = 0;
    try {
      const prices = await this.priceFetcher();
      for (const tick of prices) {
        const sym = tick.symbol.toUpperCase();
        const prevBid = this.lastPriceSnapshot.get(sym);
        if (prevBid !== tick.bid) {
          this.lastPriceSnapshot.set(sym, tick.bid);
          this.broadcastMarketTick(tick);
          changed += 1;
        }
      }
    } catch {
      // Ignore background polling errors
    }

    // Adaptive cadence: quiet market backs off ×2 (≤30s); any change snaps
    // straight back to base so traders never wait during activity.
    this.marketDelayMs =
      changed > 0
        ? Number(process.env.MARKET_TICKER_INTERVAL_MS) || 5000
        : Math.min(this.marketDelayMs * 2, SseHub.MARKET_MAX_DELAY_MS);

    this.scheduleMarketTick();
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    sseHub: SseHub;
  }
}

const ssePluginCallback: FastifyPluginAsync = async (fastify) => {
  const sseHub = new SseHub();
  fastify.decorate('sseHub', sseHub);

  fastify.addHook('onClose', async () => {
    fastify.log.info('[SHUTDOWN] SseHub onClose hook starting...');
    fastify.log.info('Closing all active SSE connections in SseHub...');
    sseHub.closeAll();
    fastify.log.info('[SHUTDOWN] SseHub onClose hook finished.');
  });
};

export const ssePlugin = fp(ssePluginCallback, {
  name: 'sse-plugin'
});
