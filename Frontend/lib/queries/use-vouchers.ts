'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreditVoucher, PaginatedResult } from '@/lib/types';
import type { CreateVoucherInput } from '@/lib/schemas/admin.schema';

export interface VouchersQueryParams {
  page?: number;
  limit?: number;
  isRedeemed?: boolean;
  sortBy?: 'createdAt' | 'amount' | 'redeemedAt';
  sortOrder?: 'asc' | 'desc';
}

export function useVouchersQuery(params: VouchersQueryParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.isRedeemed !== undefined) searchParams.set('isRedeemed', params.isRedeemed.toString());
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const queryString = searchParams.toString();

  return useQuery<PaginatedResult<CreditVoucher>>({
    queryKey: ['admin', 'vouchers', params],
    queryFn: async () => {
      const res = await fetch(`/api/admin/vouchers${queryString ? `?${queryString}` : ''}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Failed to fetch vouchers (${res.status})`);
      }
      const json = await res.json();
      return {
        data: json.data || [],
        meta: json.meta || { page: 1, limit: 20, total: 0, totalPages: 1 }
      };
    }
  });
}

export function useCreateVoucherMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateVoucherInput) => {
      const res = await fetch('/api/admin/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Failed to create voucher');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vouchers'] });
    }
  });
}

export function useRevokeVoucherMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (voucherId: string) => {
      const res = await fetch(`/api/admin/vouchers/${voucherId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Failed to revoke voucher');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vouchers'] });
    }
  });
}

export function useBatchRevokeVouchersMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (voucherIds: string[]) => {
      const res = await fetch('/api/admin/vouchers/batch-revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: voucherIds })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Failed to batch revoke vouchers');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vouchers'] });
    }
  });
}
