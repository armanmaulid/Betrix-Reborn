import { FastifyPluginAsync, FastifyReply, FastifyRequest, type FastifyBaseLogger } from 'fastify';
import { PassThrough } from 'node:stream';
import fp from 'fastify-plugin';
import { PriceTick, NewsArticle } from '@betrix/domain';

export interface SseClient {
  id: string;
  userId: string;
  channel: 'market' | 'news' | 'ops';
  stream: PassThrough;
  /** True while the kernel/downstream buffer is full — frames are dropped, the
   *  client is NOT (P3: a transient burst must never kill a healthy socket). */
  paused?: boolean;
  symbols?: Set<string>;
  connectedAt: Date;
}

export interface OpsSnapshot {
  metrics: unknown;
  analytics: unknown;
}

/**
 * P2 — single SSE frame serializer, shared by the hub and the chat route so
 * the `event:/data:` wire format lives in exactly one place. `JSON.stringify`
 * already invokes `toJSON()` on domain objects, so callers pass the raw value.
 */
export function sseFrame(event: string, data: unknown): string {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  return `event: ${event}\ndata: ${payload}\n\n`;
}

export class SseHub {
  private clients = new Map<string, SseClient>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private marketTimer: NodeJS.Timeout | null = null;
  private marketDelayMs = Number(process.env.MARKET_TICKER_INTERVAL_MS) || 5000;
  private static readonly MARKET_MAX_DELAY_MS = 30_000;
  private lastPriceSnapshot = new Map<string, number>();
  private priceFetcher: (() => Promise<PriceTick[]>) | null = null;
  private opsTickerTimer: NodeJS.Timeout | null = null;
  private opsFetcher: (() => Promise<OpsSnapshot>) | null = null;

  /** T2.5 — daily command budget for the SSE tickers (fail-safe, in-process).
   *  NOTE (P13): this is per-process, so N replicas each get their own budget.
   *  A Redis-native self-expiring counter is the correct shared implementation
   *  (the redis client isn't decorated yet when this plugin boots) — deferred. */
  private redisBudgetUsedToday = 0;
  private budgetDayUtc = new Date().getUTCDate();
  private budgetWarnedAt = 0;

  constructor(private readonly logger: FastifyBaseLogger) {
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
    // P1 — hand the stream to Fastify's lifecycle (reply.send) instead of
    // poking reply.raw directly. This restores CORS/helmet hooks, content-type
    // negotiation, and onClose teardown for SSE responses.
    const stream = new PassThrough();
    reply.header('Content-Type', 'text/event-stream');
    reply.header('Cache-Control', 'no-cache, no-transform');
    reply.header('Connection', 'keep-alive');
    reply.header('X-Accel-Buffering', 'no');
    reply.send(stream);

    const client: SseClient = {
      id,
      userId,
      channel,
      stream,
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
    // ASYNCHRONOUSLY — a synchronous try/catch around stream.write() never sees
    // them. Without this listener a burst of disconnects during broadcast can
    // crash the whole process with an unhandled 'error' event.
    stream.on('error', () => {
      this.removeClient(id);
    });
  }

  public removeClient(id: string): void {
    const client = this.clients.get(id);
    if (client) {
      try {
        client.stream.end();
      } catch {
        // ignore if already closed
      }
      this.clients.delete(id);
    }
  }

  public broadcastMarketTick(tick: PriceTick | unknown): void {
    const symbol = ((tick as PriceTick).symbol || '').toUpperCase();

    for (const client of this.clients.values()) {
      if (client.channel !== 'market') continue;

      if (!client.symbols || client.symbols.has(symbol)) {
        this.sendEvent(client, 'tick', tick);
      }
    }
  }

  public broadcastNews(article: NewsArticle | unknown): void {
    for (const client of this.clients.values()) {
      if (client.channel !== 'news') continue;
      this.sendEvent(client, 'news', article);
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
        client.stream.end();
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
    this.writeFrame(client, sseFrame(event, data));
  }

  /**
   * P3 — backpressure-correct frame writer. `write()` returning false only
   * means the downstream buffer is momentarily full; we pause (drop frames)
   * and resume on 'drain' rather than tearing down a perfectly healthy client.
   */
  private writeFrame(client: SseClient, frame: string): void {
    const w = client.stream;
    if (w.destroyed || w.writableEnded) {
      this.removeClient(client.id);
      return;
    }
    if (client.paused) return;
    const ok = w.write(frame);
    if (!ok) {
      client.paused = true;
      w.once('drain', () => {
        client.paused = false;
      });
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      for (const client of this.clients.values()) {
        if (client.stream.destroyed || client.stream.writableEnded) {
          this.removeClient(client.id);
          continue;
        }
        this.writeFrame(client, sseFrame('ping', Date.now()));
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
    if (this.marketTimer) return;
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
        this.logger.warn(
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
  const sseHub = new SseHub(fastify.log.child({ plugin: 'sse' }));
  fastify.decorate('sseHub', sseHub);

  // F-1 + F-13 — preClose (not onClose) so active SSE clients end before
  // Fastify tries to drain keep-alive connections. With onClose, Fastify
  // waits up to `keepAliveTimeout` (default 72s in Node) for clients to
  // disconnect, which defeats graceful shutdown. preClose fires before
  // that, ending all SSE streams immediately so app.close() can return.
  fastify.addHook('preClose', async () => {
    fastify.log.info('Closing all active SSE connections in SseHub...');
    sseHub.closeAll();
  });
};

export const ssePlugin = fp(ssePluginCallback, {
  name: 'sse-plugin'
});
