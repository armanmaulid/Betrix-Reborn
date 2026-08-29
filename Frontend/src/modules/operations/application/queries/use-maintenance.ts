'use client';

import type { SystemCleanupInput } from '@/modules/operations/application/schemas/admin.schema';
import { operationsRepository } from '@/modules/operations/infrastructure/repositories/HttpOperationsRepository';
import { useAdminMutation } from '@/shared/application/useAdminMutation';
import { operationsKeys } from '@/modules/operations/application/operations.keys';
import { analyticsKeys } from '@/modules/analytics/application/analytics.keys';

export interface CleanupResult {
  expiredSessionsDeleted: number;
  expiredTokensDeleted: number;
  oldLoginAttemptsDeleted: number;
}

export function useCleanupMutation() {
  return useAdminMutation<CleanupResult, SystemCleanupInput>(
    (data) => operationsRepository.runSystemCleanup(data),
    [operationsKeys.auditLogs(), operationsKeys.workers(), analyticsKeys.metrics()]
  );
}
