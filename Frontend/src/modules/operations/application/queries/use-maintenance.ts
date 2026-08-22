'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SystemCleanupInput } from '@/modules/operations/application/schemas/admin.schema';
import { apiFetch } from '@shared/infrastructure/http/api-client';

export interface CleanupResult {
  expiredSessionsDeleted: number;
  expiredTokensDeleted: number;
  oldLoginAttemptsDeleted: number;
}

export function useCleanupMutation() {
  const queryClient = useQueryClient();

  return useMutation<CleanupResult, Error, SystemCleanupInput>({
    mutationFn: async (data: SystemCleanupInput) => {
      const json = await apiFetch<any>('/api/admin/cleanup', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return json.data || json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
    }
  });
}
