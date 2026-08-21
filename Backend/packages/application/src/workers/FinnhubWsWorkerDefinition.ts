import { IWorkerDefinition } from './types.js';

export const FinnhubWsWorkerDefinition: IWorkerDefinition = {
  id: 'finnhub-realtime-ws',
  name: 'Finnhub Realtime WS Stream Worker',
  category: 'market',
  description: 'Maintains persistent WebSocket connection to wss://ws.finnhub.io for live market price ticks, symbol mapping, and low-latency SSE broadcast.',
  interval: 'Real-time (<50ms)',
  defaultStatus: 'running',
  initialProcessedCount: 15820,
  nextRunOffsetMs: null
};
