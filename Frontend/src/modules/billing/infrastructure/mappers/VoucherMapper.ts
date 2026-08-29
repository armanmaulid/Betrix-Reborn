import {
  CreditVoucher,
  type CreditVoucherProps
} from '@/modules/billing/domain/entities/CreditVoucher';
import { toDomainPaginated } from '@/shared/domain/types/Pagination';
import type { PaginationMeta } from '@/shared/domain/types/Pagination';

export class VoucherMapper {
  public static toDomain(dto: unknown): CreditVoucher {
    const d = dto as CreditVoucherProps;
    return new CreditVoucher({
      id: d.id,
      code: d.code,
      amount: Number(d.amount || 0),
      isRedeemed: Boolean(d.isRedeemed),
      redeemedById: d.redeemedById,
      redeemedAt: d.redeemedAt,
      expiresAt: d.expiresAt,
      createdById: d.createdById,
      createdAt: d.createdAt || new Date(),
      updatedAt: d.updatedAt
    });
  }

  public static toDomainPaginated(
    paginatedDto: { data?: unknown[]; meta?: PaginationMeta } | unknown[]
  ) {
    return toDomainPaginated(paginatedDto, VoucherMapper.toDomain);
  }
}
