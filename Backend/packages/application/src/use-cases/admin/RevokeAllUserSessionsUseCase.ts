import { randomUUID } from 'node:crypto';
import { ISessionRepository, IAdminActionRepository, AdminAction } from '@betrix/domain';

export class RevokeAllUserSessionsUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly adminActionRepo?: IAdminActionRepository
  ) {}

  public async execute(
    adminId: string,
    targetUserId: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<{ success: boolean; revokedCount: number }> {
    const revokedCount = await this.sessionRepo.deleteByUserId(targetUserId);

    if (this.adminActionRepo && adminId) {
      await this.adminActionRepo.save(
        new AdminAction({
          id: randomUUID(),
          adminId,
          action: 'REVOKE_ALL_USER_SESSIONS',
          targetType: 'user',
          targetId: targetUserId,
          details: { revokedCount },
          ip: context?.ip,
          userAgent: context?.userAgent,
          createdAt: new Date()
        })
      );
    }

    return { success: true, revokedCount };
  }
}
