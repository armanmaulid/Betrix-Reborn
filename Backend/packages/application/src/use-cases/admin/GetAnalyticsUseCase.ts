import { IAnalyticsRepository, UserAnalytics, AnalyticsQueryOptions } from '@betrix/domain';

export class GetAnalyticsUseCase {
  constructor(private readonly analyticsRepo: IAnalyticsRepository) {}

  public async execute(options?: AnalyticsQueryOptions): Promise<UserAnalytics> {
    return this.analyticsRepo.getUserAnalytics(options);
  }

  /** T3.1 — cached default-period snapshot for the SSE ops ticker; null on miss. */
  public async executeCachedDefault(): Promise<UserAnalytics | null> {
    return this.analyticsRepo.getUserAnalyticsCached();
  }
}
