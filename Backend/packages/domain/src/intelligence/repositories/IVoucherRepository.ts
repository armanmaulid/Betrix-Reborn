import { Nullable, PaginatedResult, PaginationParams } from '@betrix/core';
import { CreditVoucher } from '../entities/CreditVoucher.js';

export interface IVoucherRepository {
  create(voucher: CreditVoucher): Promise<CreditVoucher>;
  findByCode(code: string): Promise<Nullable<CreditVoucher>>;
  findById(id: string): Promise<Nullable<CreditVoucher>>;
  redeem(voucherId: string, userId: string): Promise<boolean>;
  revoke(voucherId: string): Promise<boolean>;
  findAll(pagination: PaginationParams): Promise<PaginatedResult<CreditVoucher>>;
}
