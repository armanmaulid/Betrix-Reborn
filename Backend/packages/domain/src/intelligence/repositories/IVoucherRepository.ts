import { Nullable, PaginatedResult, PaginationParams } from '@betrix/core';
import { CreditVoucher } from '../entities/CreditVoucher.js';

export interface VoucherFilter {
  isRedeemed?: boolean;
}

export type VoucherSortField = 'createdAt' | 'amount' | 'redeemedAt';

export interface VoucherSort {
  sortBy?: VoucherSortField;
  sortOrder?: 'asc' | 'desc';
}

export interface IVoucherRepository {
  create(voucher: CreditVoucher): Promise<CreditVoucher>;
  findByCode(code: string): Promise<Nullable<CreditVoucher>>;
  findById(id: string): Promise<Nullable<CreditVoucher>>;
  redeem(voucherId: string, userId: string): Promise<boolean>;
  revoke(voucherId: string): Promise<boolean>;
  findAll(pagination: PaginationParams, filter?: VoucherFilter, sort?: VoucherSort): Promise<PaginatedResult<CreditVoucher>>;
}
