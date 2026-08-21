'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SystemCleanupInput } from '@/lib/schemas/admin.schema';

export interface CleanupResult {
  expiredSessionsDeleted: number;
  expiredTokensDeleted: number;
  oldLoginAttemptsDeleted: number;
}

export function useCleanupMutation() {
  const queryClient = useQueryClient();

  return useMutation<CleanupResult, Error, SystemCleanupInput>({
    mutationFn: async (data: SystemCleanupInput) => {
      const res = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Failed to execute system maintenance cleanup');
      }
      const json = await res.json();
      return json.data || json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
    }
  });
}
