import { randomUUID } from 'node:crypto';
import { NotFoundError } from '@betrix/core';
import { IVoucherRepository, IAdminActionRepository, AdminAction } from '@betrix/domain';

export class RevokeVoucherUseCase {
  constructor(
    private readonly voucherRepo: IVoucherRepository,
    private readonly adminActionRepo: IAdminActionRepository
  ) {}

  public async execute(
    adminId: string,
    voucherId: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<{ success: boolean }> {
    const voucher = await this.voucherRepo.findById(voucherId);
    if (!voucher) {
      throw new NotFoundError('Voucher not found.');
    }

    const revoked = await this.voucherRepo.revoke(voucherId);

    const action = new AdminAction({
      id: randomUUID(),
      adminId,
      action: 'REVOKE_VOUCHER',
      targetType: 'voucher',
      targetId: voucherId,
      details: { code: voucher.code },
      ip: context?.ip,
      userAgent: context?.userAgent,
      createdAt: new Date()
    });

    await this.adminActionRepo.save(action);

    return { success: revoked };
  }
}
