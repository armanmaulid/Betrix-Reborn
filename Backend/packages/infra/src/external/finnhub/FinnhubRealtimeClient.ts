import WebSocket from 'ws';
import { IRealtimeProvider, PriceTick } from '@betrix/domain';

export interface FinnhubSymbolMap {
  [internalSymbol: string]: string; // EURUSD -> OANDA:EUR_USD
}

export class FinnhubRealtimeClient implements IRealtimeProvider {
  private ws: WebSocket | null = null;
  private readonly apiKey: string;
  private readonly wsUrl: string;
  private subscribedSymbols: Set<string> = new Set();
  private symbolMap: Record<string, string> = {}; // EURUSD -> OANDA:EUR_USD
  private reverseMap: Record<string, string> = {}; // OANDA:EUR_USD -> EURUSD
  private listeners: ((tick: PriceTick) => void)[] = [];
  private reconnectAttempt = 0;
  private isConnecting = false;
  private shouldReconnect = true;

  constructor(apiKey: string, wsUrl: string = 'wss://ws.finnhub.io', initialMap: FinnhubSymbolMap = {}) {
    this.apiKey = apiKey;
    this.wsUrl = wsUrl;
    this.updateSymbolMap(initialMap);
  }

  public updateSymbolMap(map: FinnhubSymbolMap): void {
    this.symbolMap = { ...this.symbolMap, ...map };
    this.reverseMap = {};
    for (const [internalSym, finnhubSym] of Object.entries(this.symbolMap)) {
      this.reverseMap[finnhubSym] = internalSym.toUpperCase();
    }
  }

  public async connect(): Promise<void> {
    if (!this.apiKey) {
      console.warn('[FinnhubRealtimeClient] FINNHUB_API_KEY is not configured. Realtime WebSocket disabled.');
      return;
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    const url = `${this.wsUrl}?token=${this.apiKey}`;
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log('[FinnhubRealtimeClient] Connected to Finnhub WebSocket.');
      this.isConnecting = false;
      this.reconnectAttempt = 0;
      this.resubscribeAll();
    });

    this.ws.on('message', (data: WebSocket.RawData) => {
      try {
        const message = JSON.parse(data.toString());

        // Invariant 3: Respond to application-level ping frames
        if (message.type === 'ping') {
          this.ws?.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if (message.type === 'trade' && Array.isArray(message.data)) {
          for (const trade of message.data) {
            const internalSymbol = this.reverseMap[trade.s] || trade.s;
            const price = Number(trade.p);
            const volume = Number(trade.v || 0);
            const timestamp = Number(trade.t || Date.now());

            const tick = new PriceTick({
              symbol: internalSymbol,
              bid: price,
              ask: price,
              spread: 0,
              volume,
              timestamp
            });

            for (const listener of this.listeners) {
              try {
                listener(tick);
              } catch (err) {
                console.error('[FinnhubRealtimeClient] Error in tick listener:', err);
              }
            }
          }
        }
      } catch (err) {
        console.error('[FinnhubRealtimeClient] Failed to parse message:', err);
      }
    });

    this.ws.on('close', (code, reason) => {
      console.warn(`[FinnhubRealtimeClient] Disconnected (code: ${code}, reason: ${reason}).`);
      this.isConnecting = false;
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    });

    this.ws.on('error', (err) => {
      console.error('[FinnhubRealtimeClient] WebSocket error:', err.message);
    });
  }

  public async disconnect(): Promise<void> {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public subscribeSymbols(symbols: string[]): void {
    for (const sym of symbols) {
      const upper = sym.toUpperCase();
      this.subscribedSymbols.add(upper);
      const finnhubSym = this.symbolMap[upper] || upper;

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'subscribe', symbol: finnhubSym }));
      }
    }
  }

  public onPriceTick(callback: (tick: PriceTick) => void): void {
    this.listeners.push(callback);
  }

  private resubscribeAll(): void {
    for (const sym of this.subscribedSymbols) {
      const finnhubSym = this.symbolMap[sym] || sym;
      this.ws?.send(JSON.stringify({ type: 'subscribe', symbol: finnhubSym }));
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempt++;
    const delay = Math.min(5000 * Math.min(this.reconnectAttempt, 5), 25000);
    console.log(`[FinnhubRealtimeClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})...`);
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect().catch((err) => {
          console.error('[FinnhubRealtimeClient] Reconnection failed:', err);
        });
      }
    }, delay);
  }
}
