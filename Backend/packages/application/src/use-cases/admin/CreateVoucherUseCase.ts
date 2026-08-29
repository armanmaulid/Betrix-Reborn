import { randomUUID } from 'node:crypto';
import { generateSecureToken, isUuid } from '@betrix/core';
import {
  IVoucherRepository,
  IAdminActionRepository,
  CreditVoucher,
  AdminAction
} from '@betrix/domain';
import { CreateVoucherDTO } from '../../schemas/admin.schema.js';

export class CreateVoucherUseCase {
  constructor(
    private readonly voucherRepo: IVoucherRepository,
    private readonly adminActionRepo: IAdminActionRepository
  ) {}

  public async execute(
    adminId: string,
    dto: CreateVoucherDTO,
    context?: { ip?: string; userAgent?: string }
  ): Promise<CreditVoucher> {
    const voucherCode = dto.code
      ? dto.code.trim().toUpperCase()
      : `BTX-${generateSecureToken(8).toUpperCase()}`;

    const isAdminUuid = isUuid(adminId);

    const voucher = new CreditVoucher({
      id: randomUUID(),
      code: voucherCode,
      amount: dto.amount,
      createdById: isAdminUuid ? adminId : null,
      isRedeemed: false,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      createdAt: new Date()
    });

    const saved = await this.voucherRepo.create(voucher);

    const action = new AdminAction({
      id: randomUUID(),
      adminId,
      action: 'CREATE_VOUCHER',
      targetType: 'voucher',
      targetId: saved.id,
      details: { code: saved.code, amount: saved.amount },
      ip: context?.ip,
      userAgent: context?.userAgent,
      createdAt: new Date()
    });

    await this.adminActionRepo.save(action);

    return saved;
  }
}
