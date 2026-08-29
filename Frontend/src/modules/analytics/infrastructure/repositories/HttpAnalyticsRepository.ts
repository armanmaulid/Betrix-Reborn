import type { IAnalyticsRepository } from '../../domain/repositories/IAnalyticsRepository';
import { SystemMetrics, type SystemMetricsProps } from '../../domain/entities/SystemMetrics';
import { AnalyticsMapper } from '../mappers/AnalyticsMapper';
import { HttpClient, unwrapData } from '@/shared/infrastructure/http/api-client';
import type { UserAnalytics, AnalyticsQueryParams } from '../../domain/entities/SystemMetrics';

export class HttpAnalyticsRepository implements IAnalyticsRepository {
  constructor(private http: HttpClient = new HttpClient()) {}

  async getSystemMetrics(): Promise<SystemMetrics> {
    const res = await this.http.get<{ data: SystemMetricsProps }>('/api/admin/metrics');
    return AnalyticsMapper.toSystemMetrics(unwrapData<SystemMetricsProps>(res));
  }

  async getUserAnalytics(params?: AnalyticsQueryParams): Promise<UserAnalytics> {
    const res = await this.http.get<{ data: UserAnalytics }>('/api/admin/analytics', {
      queryParams: params as Record<string, string | undefined>
    });
    return unwrapData<UserAnalytics>(res);
  }
}

export const analyticsRepository = new HttpAnalyticsRepository();
