'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BroadcastMessageInput } from '@/modules/operations/application/schemas/admin.schema';
import { apiFetch } from '@shared/infrastructure/http/api-client';

export interface BroadcastResponse {
  recipientsCount: number;
  message: string;
}

export function useBroadcastMutation() {
  const queryClient = useQueryClient();

  return useMutation<BroadcastResponse, Error, BroadcastMessageInput>({
    mutationFn: async (data: BroadcastMessageInput) => {
      const json = await apiFetch<any>('/api/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return json.data || json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
    }
  });
}
