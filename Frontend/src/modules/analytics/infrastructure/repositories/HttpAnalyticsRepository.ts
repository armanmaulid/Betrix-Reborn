import type { IAnalyticsRepository } from '../../domain/repositories/IAnalyticsRepository';
import { SystemMetrics } from '../../domain/entities/SystemMetrics';
import { AnalyticsMapper } from '../mappers/AnalyticsMapper';
import { HttpClient } from '@shared/infrastructure/http/api-client';
import type { UserAnalytics, AnalyticsQueryParams } from '@/lib/types';

export class HttpAnalyticsRepository implements IAnalyticsRepository {
  constructor(private http: HttpClient = new HttpClient()) {}

  async getSystemMetrics(): Promise<SystemMetrics> {
    const res = await this.http.get<{ data: any }>('/api/admin/metrics');
    return AnalyticsMapper.toSystemMetrics(res.data ?? res);
  }

  async getUserAnalytics(params?: AnalyticsQueryParams): Promise<UserAnalytics> {
    const res = await this.http.get<{ data: UserAnalytics }>('/api/admin/analytics', {
      queryParams: params as Record<string, any>
    });
    return res.data ?? (res as unknown as UserAnalytics);
  }
}

export const analyticsRepository = new HttpAnalyticsRepository();
