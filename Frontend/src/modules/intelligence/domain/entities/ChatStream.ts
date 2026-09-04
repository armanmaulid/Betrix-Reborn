/**
 * Domain model for the real-time chat streaming feature.
 *
 * These types mirror the backend's SSE contract (`/chat/stream`): the server
 * emits `context` / `think` / `delta` / `done` / `error` events whose payloads
 * are described here. Keeping them in the domain layer (rather than inline in a
 * component) is what lets the presentation layer stay free of transport details.
 */

export interface StreamDoneMeta {
  sessionId: string;
  agentId?: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  creditsSpent: number;
}

export interface InjectedCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface InjectedNews {
  headline: string;
  summary: string;
  time: string;
}

export interface InjectedContext {
  metadata: {
    symbol: string;
    timeframe: string;
    candlesLoaded: number;
    lastPrice?: number;
    indicatorsComputed: boolean;
    newsIncluded: number;
  };
  contextBlock: string;
  candles: InjectedCandle[];
  news: InjectedNews[];
}

export interface MarketContextOptions {
  symbol: string;
  timeframe: string;
  candleCount: number;
  includeCandles: boolean;
  includeIndicators: boolean;
  includeNews: boolean;
  newsLimit: number;
}

export interface ChatStreamRequest {
  sessionId: string;
  agentId?: string;
  message: string;
  marketContext?: MarketContextOptions;
}

export interface ChatStreamCallbacks {
  onContext?: (context: InjectedContext) => void;
  onThink?: (chunk: string) => void;
  onDelta?: (chunk: string) => void;
  onDone?: (meta: StreamDoneMeta) => void;
  onError?: (message: string) => void;
}
