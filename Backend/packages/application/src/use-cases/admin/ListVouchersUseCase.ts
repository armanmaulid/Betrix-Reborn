import { PaginatedResult, PaginationParams } from '@betrix/core';
import { IVoucherRepository, CreditVoucher } from '@betrix/domain';

export class ListVouchersUseCase {
  constructor(private readonly voucherRepo: IVoucherRepository) {}

  public async execute(pagination: PaginationParams): Promise<PaginatedResult<CreditVoucher>> {
    return this.voucherRepo.findAll(pagination);
  }
}
