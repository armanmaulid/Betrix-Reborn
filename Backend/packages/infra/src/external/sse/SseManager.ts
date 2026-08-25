import { ServerResponse } from 'node:http';
import { INotifier } from '@betrix/domain';

export interface SseClient {
  id: string;
  userId: string;
  channel: 'market' | 'news';
  res: ServerResponse;
  connectedAt: Date;
}

export class SseManager implements INotifier {
  private clients: Map<string, SseClient> = new Map();
  private userClientCounts: Map<string, number> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly maxConnectionsPerUser = 5;

  constructor() {
    this.startHeartbeat();
  }

  public registerClient(
    id: string,
    userId: string,
    channel: 'market' | 'news',
    res: ServerResponse
  ): boolean {
    const currentCount = this.userClientCounts.get(userId) || 0;
    if (currentCount >= this.maxConnectionsPerUser) {
      this.evictOldestForUser(userId);
    }

    const client: SseClient = {
      id,
      userId,
      channel,
      res,
      connectedAt: new Date()
    };

    this.clients.set(id, client);
    this.userClientCounts.set(userId, (this.userClientCounts.get(userId) || 0) + 1);

    // Initial SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    res.write(
      `event: connected\ndata: ${JSON.stringify({ clientId: id, channel, timestamp: Date.now() })}\n\n`
    );

    res.on('close', () => {
      this.removeClient(id);
    });

    return true;
  }

  public removeClient(id: string): void {
    const client = this.clients.get(id);
    if (!client) return;

    this.clients.delete(id);
    const count = this.userClientCounts.get(client.userId) || 1;
    if (count <= 1) {
      this.userClientCounts.delete(client.userId);
    } else {
      this.userClientCounts.set(client.userId, count - 1);
    }
  }

  public broadcastGlobal(channel: 'market' | 'news', event: string, payload: unknown): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.clients.values()) {
      if (client.channel === channel) {
        try {
          client.res.write(message);
        } catch {
          this.removeClient(client.id);
        }
      }
    }
  }

  public broadcastToUser(userId: string, event: string, payload: unknown): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        try {
          client.res.write(message);
        } catch {
          this.removeClient(client.id);
        }
      }
    }
  }

  public getStats(): {
    totalClients: number;
    marketClients: number;
    newsClients: number;
    uniqueUsers: number;
  } {
    let marketClients = 0;
    let newsClients = 0;
    for (const client of this.clients.values()) {
      if (client.channel === 'market') marketClients++;
      else if (client.channel === 'news') newsClients++;
    }

    return {
      totalClients: this.clients.size,
      marketClients,
      newsClients,
      uniqueUsers: this.userClientCounts.size
    };
  }

  private evictOldestForUser(userId: string): void {
    let oldest: SseClient | null = null;
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        if (!oldest || client.connectedAt < oldest.connectedAt) {
          oldest = client;
        }
      }
    }

    if (oldest) {
      try {
        oldest.res.write(
          `event: error\ndata: ${JSON.stringify({ error: 'CONCURRENCY_LIMIT_EXCEEDED' })}\n\n`
        );
        oldest.res.end();
      } catch {
        // ignore
      }
      this.removeClient(oldest.id);
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      const ping = `: ping - ${Date.now()}\n\n`;
      for (const client of this.clients.values()) {
        try {
          client.res.write(ping);
        } catch {
          this.removeClient(client.id);
        }
      }
    }, 15000);
  }

  public shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const client of this.clients.values()) {
      try {
        client.res.end();
      } catch {
        // ignore
      }
    }
    this.clients.clear();
    this.userClientCounts.clear();
  }
}
