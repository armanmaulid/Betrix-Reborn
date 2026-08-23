import { SystemMetrics, type UserAnalytics, type AnalyticsQueryParams } from '../entities/SystemMetrics';

export interface IAnalyticsRepository {
  getSystemMetrics(): Promise<SystemMetrics>;
  getUserAnalytics(params?: AnalyticsQueryParams): Promise<UserAnalytics>;
}
