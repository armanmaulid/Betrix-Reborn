import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsMapper } from './mappers/AnalyticsMapper';
import { HttpAnalyticsRepository } from './repositories/HttpAnalyticsRepository';
import { HttpClient } from '@shared/infrastructure/http/api-client';

describe('Analytics Infrastructure: AnalyticsMapper & HttpAnalyticsRepository', () => {
  let mockHttpClient: HttpClient;
  let analyticsRepo: HttpAnalyticsRepository;

  beforeEach(() => {
    mockHttpClient = new HttpClient();
    analyticsRepo = new HttpAnalyticsRepository(mockHttpClient);
  });

  it('should map system metrics DTO and calculate DB pool ratio correctly', () => {
    const rawDto = {
      totalUsers: 120,
      activeSessions: 15,
      totalChats: 450,
      totalTokensUsed: 1200000,
      dbPoolActive: 8,
      dbPoolIdle: 2,
      uptimeSeconds: 86400,
      redisStatus: 'online',
      redisLatencyMs: 2
    };

    const metrics = AnalyticsMapper.toSystemMetrics(rawDto);

    expect(metrics.totalUsers).toBe(120);
    expect(metrics.dbPoolTotal).toBe(10);
    expect(metrics.dbPoolActiveRatio).toBe(0.8);
    expect(metrics.isDbPoolStressed).toBe(false);
  });

  it('should fetch system metrics via HttpAnalyticsRepository', async () => {
    vi.spyOn(mockHttpClient, 'get').mockResolvedValue({
      data: { totalUsers: 50, activeSessions: 5, totalChats: 100, totalTokensUsed: 50000, dbPoolActive: 1, dbPoolIdle: 9, uptimeSeconds: 100 }
    });

    const res = await analyticsRepo.getSystemMetrics();

    expect(res.totalUsers).toBe(50);
    expect(res.dbPoolActiveRatio).toBe(0.1);
  });
});
