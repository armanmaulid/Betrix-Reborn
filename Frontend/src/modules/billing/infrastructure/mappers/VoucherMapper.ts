import { CreditVoucher } from '@billing/domain/entities/CreditVoucher';
import { toDomainPaginated } from '@shared/domain/types/Pagination';

export class VoucherMapper {
  public static toDomain(dto: any): CreditVoucher {
    return new CreditVoucher({
      id: dto.id,
      code: dto.code,
      amount: Number(dto.amount || 0),
      isRedeemed: Boolean(dto.isRedeemed),
      redeemedById: dto.redeemedById,
      redeemedAt: dto.redeemedAt,
      expiresAt: dto.expiresAt,
      createdById: dto.createdById,
      createdAt: dto.createdAt || new Date(),
      updatedAt: dto.updatedAt
    });
  }

  public static toDomainPaginated(paginatedDto: any) {
    return toDomainPaginated(paginatedDto, VoucherMapper.toDomain);
  }
}
