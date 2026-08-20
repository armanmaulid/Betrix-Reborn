import {
  ISessionRepository,
  IVerificationRepository,
  ILoginAttemptRepository
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
    private readonly loginAttemptRepo: ILoginAttemptRepository
  ) {}

  public async execute(dto?: SystemCleanupDTO): Promise<CleanupResult> {
    const days = dto?.olderThanDays || 30;

    const [expiredSessionsDeleted, expiredTokensDeleted, oldLoginAttemptsDeleted] =
      await Promise.all([
        this.sessionRepo.deleteExpired(),
        this.verificationRepo.cleanupExpired(),
        this.loginAttemptRepo.cleanupOlderThan(days)
      ]);

    return {
      expiredSessionsDeleted,
      expiredTokensDeleted,
      oldLoginAttemptsDeleted
    };
  }
}
