import { PaginatedResult, PaginationParams } from '@betrix/core';
import { IVoucherRepository, CreditVoucher, VoucherFilter, VoucherSort } from '@betrix/domain';

export class ListVouchersUseCase {
  constructor(private readonly voucherRepo: IVoucherRepository) {}

  public async execute(
    pagination: PaginationParams,
    filter?: VoucherFilter,
    sort?: VoucherSort
  ): Promise<PaginatedResult<CreditVoucher>> {
    return this.voucherRepo.findAll(pagination, filter, sort);
  }
}
