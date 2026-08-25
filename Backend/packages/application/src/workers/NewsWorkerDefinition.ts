import { IWorkerDefinition } from './types.js';

export const NewsWorkerDefinition: IWorkerDefinition = {
  id: 'finnhub-news-poller',
  name: 'Smart News Ingestion Worker',
  category: 'news',
  description:
    'Periodically polls global market, forex, and crypto news from Finnhub REST API, tags articles with semantic market tags, and broadcasts via SSE stream.',
  interval: '10s',
  defaultStatus: 'running',
  initialProcessedCount: 240,
  nextRunOffsetMs: 10000
};
