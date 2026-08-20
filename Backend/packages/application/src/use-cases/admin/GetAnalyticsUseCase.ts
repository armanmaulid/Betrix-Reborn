import { IAnalyticsRepository, UserAnalytics } from '@betrix/domain';

export class GetAnalyticsUseCase {
  constructor(private readonly analyticsRepo: IAnalyticsRepository) {}

  public async execute(): Promise<UserAnalytics> {
    return this.analyticsRepo.getUserAnalytics();
  }
}
