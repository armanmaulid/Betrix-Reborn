'use client';

import { useQuery } from '@tanstack/react-query';
import { voucherRepository } from '@/modules/billing/infrastructure/repositories/HttpVoucherRepository';
import { billingKeys } from '@/modules/billing/application/billing.keys';
import { useAdminMutation } from '@/shared/application/useAdminMutation';
import type { CreditVoucher } from '@/modules/billing/domain/entities/CreditVoucher';
import type { CreateVoucherInput } from '@/modules/billing/application/schemas/voucher.schema';
import type { PaginatedResult } from '@/shared/domain/types/Pagination';

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
    queryFn: () => voucherRepository.getVouchers(params)
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
