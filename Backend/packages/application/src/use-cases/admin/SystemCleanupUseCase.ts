import { randomUUID } from 'node:crypto';
import {
  ISessionRepository,
  IVerificationRepository,
  ILoginAttemptRepository,
  IAdminActionRepository,
  AdminAction
} from '@betrix/domain';
import { SystemCleanupDTO } from '../../schemas/admin.schema.js';

export interface CleanupResult {
  expiredSessionsDeleted: number;
  expiredTokensDeleted: number;
  oldLoginAttemptsDeleted: number;
}

export class SystemCleanupUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly verificationRepo: IVerificationRepository,
    private readonly loginAttemptRepo: ILoginAttemptRepository,
    private readonly adminActionRepo?: IAdminActionRepository
  ) {}

  public async execute(
    dto?: SystemCleanupDTO,
    // Present only for manually-triggered runs (POST /admin/cleanup). The
    // hourly cron worker calls this with no adminId — that path is expected
    // and intentionally left unlogged since there's no admin actor to attribute it to.
    triggeredBy?: { adminId: string; ip?: string; userAgent?: string }
  ): Promise<CleanupResult> {
    const days = dto?.olderThanDays || 30;

    const [expiredSessionsDeleted, expiredTokensDeleted, oldLoginAttemptsDeleted] =
      await Promise.all([
        this.sessionRepo.deleteExpired(),
        this.verificationRepo.cleanupExpired(),
        this.loginAttemptRepo.cleanupOlderThan(days)
      ]);

    const result: CleanupResult = {
      expiredSessionsDeleted,
      expiredTokensDeleted,
      oldLoginAttemptsDeleted
    };

    if (triggeredBy) {
      const action = new AdminAction({
        id: randomUUID(),
        adminId: triggeredBy.adminId,
        action: 'SYSTEM_CLEANUP',
        targetType: 'system',
        targetId: 'cleanup',
        details: { olderThanDays: days, ...result },
        ip: triggeredBy.ip,
        userAgent: triggeredBy.userAgent,
        createdAt: new Date()
      });
      await this.adminActionRepo?.save(action);
    }

    return result;
  }
}
