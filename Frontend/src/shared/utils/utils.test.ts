import { describe, it, expect } from 'vitest';
import {
  cn,
  formatFinancialNumber,
  formatUptime,
  getDbPoolStats,
  getWorkerStats
} from './utils';

describe('Utility Functions (Frontend/lib/utils.ts)', () => {
  describe('cn', () => {
    it('should merge class names properly', () => {
      expect(cn('px-2', 'py-1', { 'bg-black': true, 'text-white': false })).toBe('px-2 py-1 bg-black');
    });
  });

  describe('formatFinancialNumber', () => {
    it('should format numbers with comma delimiters', () => {
      expect(formatFinancialNumber(1250000)).toBe('1,250,000');
      expect(formatFinancialNumber(0)).toBe('0');
      expect(formatFinancialNumber(1234.56, 2)).toBe('1,234.56');
    });

    it('should handle undefined, null or NaN safely', () => {
      expect(formatFinancialNumber(undefined as any)).toBe('—');
      expect(formatFinancialNumber(null as any)).toBe('—');
      expect(formatFinancialNumber(NaN)).toBe('—');
    });
  });

  describe('formatUptime', () => {
    it('should format seconds into days, hours, and minutes', () => {
      expect(formatUptime(0)).toBe('0m');
      expect(formatUptime(120)).toBe('2m');
      expect(formatUptime(3600)).toBe('1h');
      expect(formatUptime(3660)).toBe('1h 1m');
      expect(formatUptime(90000)).toBe('1d 1h');
    });
  });

  describe('getDbPoolStats', () => {
    it('should compute database pool total and usage percentage correctly', () => {
      const stats = getDbPoolStats(3, 17);
      expect(stats.active).toBe(3);
      expect(stats.idle).toBe(17);
      expect(stats.total).toBe(20);
      expect(stats.usagePct).toBe(15);
    });

    it('should provide fallback when values are undefined', () => {
      const stats = getDbPoolStats(undefined, undefined);
      expect(stats.active).toBe(0);
      expect(stats.idle).toBe(0);
      expect(stats.total).toBe(0);
      expect(stats.usagePct).toBe(0);
    });
  });

  describe('getWorkerStats', () => {
    it('should compute running and total worker count and detect websocket stream worker', () => {
      const mockWorkers = [
        {
          id: 'finnhub-realtime-ws',
          name: 'Finnhub WS Ingester',
          status: 'running',
          category: 'market',
          interval: '<50ms'
        },
        {
          id: 'news-poller',
          name: 'News Poller',
          status: 'paused',
          category: 'market',
          interval: '60s'
        }
      ];

      const stats = getWorkerStats(mockWorkers);
      expect(stats.running).toBe(1);
      expect(stats.total).toBe(2);
      expect(stats.isWsLive).toBe(true);
      expect(stats.wsWorker?.id).toBe('finnhub-realtime-ws');
    });

    it('should handle empty workers array safely', () => {
      const stats = getWorkerStats([]);
      expect(stats.running).toBe(0);
      expect(stats.total).toBe(0);
      expect(stats.isWsLive).toBe(false);
      expect(stats.wsWorker).toBeUndefined();
    });
  });
});
