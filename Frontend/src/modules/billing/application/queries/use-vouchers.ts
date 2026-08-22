'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { voucherRepository } from '@billing/infrastructure/repositories/HttpVoucherRepository';
import { billingKeys } from '@billing/application/billing.keys';
import type { CreditVoucher } from '@intelligence/domain/entities/CreditVoucher';
import type { CreateVoucherInput } from '@/modules/operations/application/schemas/admin.schema';
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVoucherInput) => voucherRepository.createVoucher(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    }
  });
}

export function useRevokeVoucherMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (voucherId: string) => voucherRepository.revokeVoucher(voucherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    }
  });
}

export function useBatchRevokeVouchersMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (voucherIds: string[]) => voucherRepository.batchRevokeVouchers(voucherIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    }
  });
}
