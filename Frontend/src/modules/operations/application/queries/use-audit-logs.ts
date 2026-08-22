'use client';

import { useQuery } from '@tanstack/react-query';
import { operationsRepository } from '@operations/infrastructure/repositories/HttpOperationsRepository';
import { operationsKeys } from '@operations/application/operations.keys';
import type { AuditLog } from '@operations/domain/entities/AuditLog';
import type { PaginatedResult } from '@shared/domain/types/Pagination';
import { formatDate } from '@/shared/utils/formatters';

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
  const queryAction = params.actionType || params.action;
  const mappedParams = {
    ...params,
    action: queryAction
  };

  return useQuery<PaginatedResult<AuditLog>>({
    queryKey: operationsKeys.auditLogs(mappedParams as Record<string, unknown>),
    queryFn: () => operationsRepository.getAuditLogs(mappedParams)
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
  a.download = `audit-logs-${formatDate(new Date())}.${params.format}`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
