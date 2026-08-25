import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { PriceTick, NewsArticle } from '@betrix/domain';

export interface SseClient {
  id: string;
  userId: string;
  channel: 'market' | 'news';
  reply: FastifyReply;
  symbols?: Set<string>;
  connectedAt: Date;
}

export class SseHub {
  private clients = new Map<string, SseClient>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private marketTickerTimer: NodeJS.Timeout | null = null;
  private lastPriceSnapshot = new Map<string, number>();
  private priceFetcher: (() => Promise<PriceTick[]>) | null = null;

  constructor() {
    this.startHeartbeat();
  }

  public setPriceFetcher(fetcher: () => Promise<PriceTick[]>): void {
    this.priceFetcher = fetcher;
    this.startMarketTicker();
  }

  public addClient(
    id: string,
    userId: string,
    channel: 'market' | 'news',
    request: FastifyRequest,
    reply: FastifyReply,
    symbols?: string[]
  ): void {
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
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.marketTickerTimer) {
      clearInterval(this.marketTickerTimer);
      this.marketTickerTimer = null;
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

  private startMarketTicker(): void {
    if (this.marketTickerTimer) return;

    this.marketTickerTimer = setInterval(async () => {
      if (!this.priceFetcher || this.clients.size === 0) return;

      let hasMarketClient = false;
      for (const client of this.clients.values()) {
        if (client.channel === 'market') {
          hasMarketClient = true;
          break;
        }
      }
      if (!hasMarketClient) return;

      try {
        const prices = await this.priceFetcher();
        for (const tick of prices) {
          const sym = tick.symbol.toUpperCase();
          const prevBid = this.lastPriceSnapshot.get(sym);
          if (prevBid !== tick.bid) {
            this.lastPriceSnapshot.set(sym, tick.bid);
            this.broadcastMarketTick(tick);
          }
        }
      } catch {
        // Ignore background polling errors
      }
    }, 1000);
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
    fastify.log.info('Closing all active SSE connections in SseHub...');
    sseHub.closeAll();
  });
};

export const ssePlugin = fp(ssePluginCallback, {
  name: 'sse-plugin'
});
