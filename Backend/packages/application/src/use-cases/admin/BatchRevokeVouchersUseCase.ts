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
    let revoked = 0;
    const failed: string[] = [];

    for (const id of voucherIds) {
      const ok = await this.voucherRepo.revoke(id).catch(() => false);
      if (ok) {
        revoked++;
      } else {
        failed.push(id);
      }
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
