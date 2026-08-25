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

export interface AtomicRedeemResult {
  /** false when the voucher was already redeemed / does not exist */
  redeemed: boolean;
  newBalance: number;
}

export interface IVoucherRepository {
  create(voucher: CreditVoucher): Promise<CreditVoucher>;
  findByCode(code: string): Promise<Nullable<CreditVoucher>>;
  findById(id: string): Promise<Nullable<CreditVoucher>>;
  redeem(voucherId: string, userId: string): Promise<boolean>;
  /**
   * Atomically mark the voucher redeemed AND grant its credits + ledger entry
   * in a single transaction. Guarantees a voucher can never be burned without
   * the credits being granted (and vice versa).
   */
  redeemAtomically(
    voucherId: string,
    userId: string,
    amount: number,
    action: string
  ): Promise<AtomicRedeemResult>;
  revoke(voucherId: string): Promise<boolean>;
  findAll(
    pagination: PaginationParams,
    filter?: VoucherFilter,
    sort?: VoucherSort
  ): Promise<PaginatedResult<CreditVoucher>>;
}
