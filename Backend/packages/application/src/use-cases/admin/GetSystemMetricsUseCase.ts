import { IAnalyticsRepository, SystemMetrics } from '@betrix/domain';

export class GetSystemMetricsUseCase {
  constructor(private readonly analyticsRepo: IAnalyticsRepository) {}

  public async execute(): Promise<SystemMetrics> {
    return this.analyticsRepo.getSystemMetrics();
  }

  /** T3.1 — Redis-backed gauges; self-heals by computing+writing on miss. */
  public async executeCached(): Promise<SystemMetrics> {
    return this.analyticsRepo.getCachedSystemMetrics();
  }
}
