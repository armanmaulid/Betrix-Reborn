import { CreditVoucher } from '@intelligence/domain/entities/CreditVoucher';
import type { PaginatedResult } from '@shared/domain/types/Pagination';

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

  public static toDomainPaginated(paginatedDto: any): PaginatedResult<CreditVoucher> {
    const rawItems = Array.isArray(paginatedDto?.data) ? paginatedDto.data : [];
    const meta = paginatedDto?.meta || {
      page: 1,
      limit: rawItems.length,
      total: rawItems.length,
      totalPages: 1
    };

    return {
      data: rawItems.map(VoucherMapper.toDomain),
      meta
    };
  }
}
