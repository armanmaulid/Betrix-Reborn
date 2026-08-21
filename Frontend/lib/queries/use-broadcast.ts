'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BroadcastMessageInput } from '@/lib/schemas/admin.schema';

export interface BroadcastResponse {
  recipientsCount: number;
  message: string;
}

export function useBroadcastMutation() {
  const queryClient = useQueryClient();

  return useMutation<BroadcastResponse, Error, BroadcastMessageInput>({
    mutationFn: async (data: BroadcastMessageInput) => {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Failed to dispatch broadcast message');
      }
      const json = await res.json();
      return json.data || json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
    }
  });
}
