'use client';

import type { SystemCleanupInput } from '@/modules/operations/application/schemas/admin.schema';
import { apiFetch } from '@shared/infrastructure/http/api-client';
import { useAdminMutation } from '@shared/application/useAdminMutation';

export interface CleanupResult {
  expiredSessionsDeleted: number;
  expiredTokensDeleted: number;
  oldLoginAttemptsDeleted: number;
}

export function useCleanupMutation() {
  return useAdminMutation<CleanupResult, SystemCleanupInput>(
    async (data) => {
      const json = await apiFetch<any>('/api/admin/cleanup', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return json.data || json;
    },
    [['admin', 'metrics'], ['admin', 'audit-logs']]
  );
}
