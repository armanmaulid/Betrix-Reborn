import { describe, it, expect } from 'vitest';
import { BackgroundWorker } from './BackgroundWorker';

describe('Operations Domain: BackgroundWorker Entity', () => {
  it('should evaluate worker status invariants and health', () => {
    const worker = new BackgroundWorker({
      id: 'market-poller',
      name: 'Market Price Poller',
      category: 'market',
      description: 'Fetches live broker quotes',
      status: 'running',
      interval: '1s',
      uptimeSeconds: 3600,
      processedCount: 12000,
      errorCount: 0
    });

    expect(worker.isRunning()).toBe(true);
    expect(worker.isPaused()).toBe(false);
    expect(worker.hasErrors()).toBe(false);
    expect(worker.status).toBe('running');
  });

  it('should identify paused and error states', () => {
    const pausedWorker = new BackgroundWorker({
      id: 'news-scraper',
      name: 'News Scraper',
      category: 'news',
      description: 'Finnhub RSS scraper',
      status: 'paused',
      interval: '60s',
      errorCount: 2
    });

    expect(pausedWorker.isPaused()).toBe(true);
    expect(pausedWorker.hasErrors()).toBe(true);
    expect(pausedWorker.status).toBe('paused');
  });
});
