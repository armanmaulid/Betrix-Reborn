import { randomUUID } from 'node:crypto';
import {
  ISessionRepository,
  IVerificationRepository,
  ILoginAttemptRepository,
  IAdminActionRepository,
  IDeviceRepository,
  INewsRepository,
  ICalendarRepository,
  IVoucherRepository,
  IChatRepository,
  IActivityLogRepository,
  AdminAction
} from '@betrix/domain';
import { SystemCleanupDTO } from '../../schemas/admin.schema.js';

export interface CleanupResult {
  expiredSessionsDeleted: number;
  expiredTokensDeleted: number;
  oldLoginAttemptsDeleted: number;
  devicesDeleted: number;
  activityLogsDeleted: number;
  newsDeleted: number;
  calendarDeleted: number;
  vouchersDeleted: number;
  chatMessagesDeleted: number;
}

export class SystemCleanupUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly verificationRepo: IVerificationRepository,
    private readonly loginAttemptRepo: ILoginAttemptRepository,
    private readonly adminActionRepo?: IAdminActionRepository,
    private readonly deviceRepo?: IDeviceRepository,
    private readonly newsRepo?: INewsRepository,
    private readonly calendarRepo?: ICalendarRepository,
    private readonly voucherRepo?: IVoucherRepository,
    private readonly chatRepo?: IChatRepository,
    private readonly activityLogRepo?: IActivityLogRepository
  ) {}

  public async execute(
    dto?: SystemCleanupDTO,
    // Present only for manually-triggered runs (POST /admin/cleanup). The
    // hourly cron worker calls this with no adminId — that path is expected
    // and intentionally left unlogged since there's no admin actor to attribute it to.
    triggeredBy?: { adminId: string; ip?: string; userAgent?: string }
  ): Promise<CleanupResult> {
    const days = dto?.olderThanDays || 30;

    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400_000);
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);

    // T4.5 — retention windows (plan §Fase 4 T4.5 / K18):
    //   devices >180d · activity_logs >90d · news >18mo · calendar < start(Y-1)
    //   vouchers redeemed/expired >90d · chat_messages >365d
    const [
      expiredSessionsDeleted,
      expiredTokensDeleted,
      oldLoginAttemptsDeleted,
      devicesDeleted,
      activityLogsDeleted,
      newsDeleted,
      calendarDeleted,
      vouchersDeleted,
      chatMessagesDeleted
    ] = await Promise.all([
      this.sessionRepo.deleteExpired(),
      this.verificationRepo.cleanupExpired(),
      this.loginAttemptRepo.cleanupOlderThan(days),
      this.deviceRepo?.deleteOlderThan(daysAgo(180)) ?? 0,
      this.activityLogRepo?.deleteOlderThan(daysAgo(90)) ?? 0,
      this.newsRepo?.deleteOlderThan(daysAgo(18 * 30)) ?? 0,
      this.calendarRepo?.deleteOlderThan(startOfLastYear) ?? 0,
      this.voucherRepo?.deleteExpiredOlderThan(daysAgo(90)) ?? 0,
      this.chatRepo?.deleteOlderThan(daysAgo(365)) ?? 0
    ]);

    const result: CleanupResult = {
      expiredSessionsDeleted,
      expiredTokensDeleted,
      oldLoginAttemptsDeleted,
      devicesDeleted,
      activityLogsDeleted,
      newsDeleted,
      calendarDeleted,
      vouchersDeleted,
      chatMessagesDeleted
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
