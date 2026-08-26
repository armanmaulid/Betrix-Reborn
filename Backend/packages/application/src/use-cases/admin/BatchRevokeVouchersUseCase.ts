import { randomUUID } from 'node:crypto';
import { IVoucherRepository, IAdminActionRepository, AdminAction } from '@betrix/domain';

export class BatchRevokeVouchersUseCase {
  constructor(
    private readonly voucherRepo: IVoucherRepository,
    private readonly adminActionRepo: IAdminActionRepository
  ) {}

  /**
   * Revoke multiple vouchers. One audit log entry for the batch.
   * Already-revoked/missing ids are reported as failed, never throw — partial success is fine.
   */
  public async execute(
    adminId: string,
    voucherIds: string[],
    context?: { ip?: string; userAgent?: string }
  ): Promise<{ revoked: number; failed: string[] }> {
    // T4.6 — single-statement batch revoke replaces the N+1 loop.
    let revoked = 0;
    const failed: string[] = [];
    try {
      revoked = await this.voucherRepo.revokeMany(voucherIds);
    } catch {
      // Unexpected error — treat all as failed.
      failed.push(...voucherIds);
    }

    const action = new AdminAction({
      id: randomUUID(),
      adminId,
      action: 'BATCH_REVOKE_VOUCHERS',
      targetType: 'voucher',
      targetId: 'batch',
      details: { requested: voucherIds.length, revoked, failed },
      ip: context?.ip,
      userAgent: context?.userAgent,
      createdAt: new Date()
    });
    await this.adminActionRepo.save(action);

    return { revoked, failed };
  }
}
