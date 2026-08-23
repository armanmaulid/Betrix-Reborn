import { randomUUID } from 'node:crypto';
import { ISessionRepository, IAdminActionRepository, AdminAction } from '@betrix/domain';

export class RevokeUserSessionUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly adminActionRepo?: IAdminActionRepository
  ) {}

  public async execute(
    adminId: string,
    targetUserId: string,
    sessionId: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<{ success: boolean }> {
    // Find the session to verify it belongs to the target user
    const sessions = await this.sessionRepo.findByUserId(targetUserId);
    const session = sessions.find((s) => s.id === sessionId);

    if (!session) {
      throw new Error('Session not found for this user.');
    }

    await this.sessionRepo.delete(session.token);

    if (this.adminActionRepo && adminId) {
      await this.adminActionRepo.save(
        new AdminAction({
          id: randomUUID(),
          adminId,
          action: 'REVOKE_USER_SESSION',
          targetType: 'user',
          targetId: targetUserId,
          details: {
            sessionId,
            ip: session.ip,
            userAgent: session.userAgent,
            deviceFingerprint: session.deviceFingerprint
          },
          ip: context?.ip,
          userAgent: context?.userAgent,
          createdAt: new Date()
        })
      );
    }

    return { success: true };
  }
}
