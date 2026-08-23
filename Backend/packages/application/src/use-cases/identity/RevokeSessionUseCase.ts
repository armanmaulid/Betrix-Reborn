import { ISessionRepository, IActivityLogRepository } from '@betrix/domain';

export class RevokeSessionUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly activityLogRepo?: IActivityLogRepository
  ) {}

  public async execute(
    token: string,
    userId?: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<{ success: boolean; message: string }> {
    await this.sessionRepo.delete(token);

    if (userId) {
      await this.activityLogRepo?.log(userId, 'LOGOUT', undefined, context?.ip, context?.userAgent);
    }

    return {
      success: true,
      message: 'Session successfully revoked.'
    };
  }
}
