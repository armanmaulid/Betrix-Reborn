import { IAnalyticsRepository, SystemMetrics } from '@betrix/domain';

export class GetSystemMetricsUseCase {
  constructor(private readonly analyticsRepo: IAnalyticsRepository) {}

  public async execute(): Promise<SystemMetrics> {
    return this.analyticsRepo.getSystemMetrics();
  }
}
