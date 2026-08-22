import { SystemMetrics } from '../entities/SystemMetrics';
import type { UserAnalytics, AnalyticsQueryParams } from '@/lib/types';

export interface IAnalyticsRepository {
  getSystemMetrics(): Promise<SystemMetrics>;
  getUserAnalytics(params?: AnalyticsQueryParams): Promise<UserAnalytics>;
}
