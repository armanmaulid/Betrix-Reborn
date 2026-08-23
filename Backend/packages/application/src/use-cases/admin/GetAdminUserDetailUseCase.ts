import { NotFoundError } from '@betrix/core';
import {
  IUserRepository,
  ISessionRepository,
  IDeviceRepository,
  IUsageRepository,
  IActivityLogRepository,
  User,
  Session,
  Device
} from '@betrix/domain';

export interface AdminUserDetailResult {
  user: User;
  sessions: Session[];
  devices: Device[];
  recentActivity: unknown[];
  usageSummary: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCreditsSpent: number;
  };
}

export class GetAdminUserDetailUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly sessionRepo: ISessionRepository,
    private readonly deviceRepo: IDeviceRepository,
    private readonly usageRepo: IUsageRepository,
    private readonly activityLogRepo?: IActivityLogRepository
  ) {}

  public async execute(userId: string): Promise<AdminUserDetailResult> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const [sessions, devices, usageSummary, activityPage] = await Promise.all([
      this.sessionRepo.findByUserId(userId),
      this.deviceRepo.findByUserId(userId),
      this.usageRepo.getSummary(userId),
      this.activityLogRepo?.findByUserId(userId, { page: 1, limit: 10 })
    ]);

    return {
      user,
      sessions,
      devices,
      recentActivity: activityPage?.data ?? [],
      usageSummary
    };
  }
}
