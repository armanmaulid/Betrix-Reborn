import { ISessionRepository, IActivityLogRepository } from '@betrix/domain';

export class LogoutAllUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly activityLogRepo?: IActivityLogRepository
  ) {}

  public async execute(
    userId: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<{ success: boolean; revokedCount: number }> {
    const count = await this.sessionRepo.deleteByUserId(userId);

    await this.activityLogRepo?.log(userId, 'LOGOUT_ALL', { revokedCount: count }, context?.ip, context?.userAgent);

    return {
      success: true,
      revokedCount: count
    };
  }
}
