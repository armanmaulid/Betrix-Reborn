import { CreditVoucher } from '@/modules/billing/domain/entities/CreditVoucher';
import type { PaginatedResult, PaginationQueryParams } from '@/shared/domain/types/Pagination';

export interface CreateVoucherInput {
  code?: string;
  amount: number;
  expiresAt?: string | null;
  count?: number;
}

export interface IVoucherRepository {
  getVouchers(params?: PaginationQueryParams): Promise<PaginatedResult<CreditVoucher>>;
  createVoucher(input: CreateVoucherInput): Promise<CreditVoucher | CreditVoucher[]>;
  revokeVoucher(id: string): Promise<void>;
  batchRevokeVouchers(ids: string[]): Promise<{ revokedCount: number }>;
}
