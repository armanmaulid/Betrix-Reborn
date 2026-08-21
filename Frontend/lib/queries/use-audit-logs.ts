'use client';

import { useQuery } from '@tanstack/react-query';
import type { AuditLog, PaginatedResult } from '@/lib/types';

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  action?: string;
  actionType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export function useAuditLogsQuery(params: AuditLogQueryParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  const actionVal = params.actionType || params.action;
  if (actionVal) {
    searchParams.set('action', actionVal);
    searchParams.set('actionType', actionVal);
  }
  if (params.userId) searchParams.set('userId', params.userId);
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);

  const queryString = searchParams.toString();

  return useQuery<PaginatedResult<AuditLog>>({
    queryKey: ['admin', 'audit-logs', params],
    queryFn: async () => {
      const res = await fetch(`/api/admin/audit-logs${queryString ? `?${queryString}` : ''}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Failed to fetch audit logs (${res.status})`);
      }
      const json = await res.json();
      return {
        data: json.data || [],
        meta: json.meta || { page: 1, limit: 50, total: 0, totalPages: 1 }
      };
    }
  });
}

export async function downloadAuditLogsExport(params: {
  format: 'csv' | 'json';
  action?: string;
  actionType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set('format', params.format);
  const actionVal = params.actionType || params.action;
  if (actionVal) {
    searchParams.set('action', actionVal);
    searchParams.set('actionType', actionVal);
  }
  if (params.userId) searchParams.set('userId', params.userId);
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);

  const res = await fetch(`/api/admin/audit-logs/export?${searchParams.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to generate export file');
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-logs-${new Date().toISOString().substring(0, 10)}.${params.format}`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
