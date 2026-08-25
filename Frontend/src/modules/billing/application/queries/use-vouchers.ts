'use client';

import { useQuery } from '@tanstack/react-query';
import { voucherRepository } from '@billing/infrastructure/repositories/HttpVoucherRepository';
import { billingKeys } from '@billing/application/billing.keys';
import { useAdminMutation } from '@shared/application/useAdminMutation';
import type { CreditVoucher } from '@billing/domain/entities/CreditVoucher';
import type { CreateVoucherInput } from '@billing/application/schemas/voucher.schema';
import type { PaginatedResult } from '@shared/domain/types/Pagination';

export interface VouchersQueryParams {
  page?: number;
  limit?: number;
  isRedeemed?: boolean;
  sortBy?: 'createdAt' | 'amount' | 'redeemedAt';
  sortOrder?: 'asc' | 'desc';
}

export function useVouchersQuery(params: VouchersQueryParams = {}) {
  return useQuery<PaginatedResult<CreditVoucher>>({
    queryKey: billingKeys.vouchers(params as Record<string, unknown>),
    queryFn: () => voucherRepository.getVouchers(params as any)
  });
}

export function useCreateVoucherMutation() {
  return useAdminMutation(
    (data: CreateVoucherInput) => voucherRepository.createVoucher(data),
    [billingKeys.all]
  );
}

export function useRevokeVoucherMutation() {
  return useAdminMutation(
    (voucherId: string) => voucherRepository.revokeVoucher(voucherId),
    [billingKeys.all]
  );
}

export function useBatchRevokeVouchersMutation() {
  return useAdminMutation(
    (voucherIds: string[]) => voucherRepository.batchRevokeVouchers(voucherIds),
    [billingKeys.all]
  );
}
