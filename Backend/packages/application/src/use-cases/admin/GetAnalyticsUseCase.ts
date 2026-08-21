import { IAnalyticsRepository, UserAnalytics, AnalyticsQueryOptions } from '@betrix/domain';

export class GetAnalyticsUseCase {
  constructor(private readonly analyticsRepo: IAnalyticsRepository) {}

  public async execute(options?: AnalyticsQueryOptions): Promise<UserAnalytics> {
    return this.analyticsRepo.getUserAnalytics(options);
  }
}
