'use client';

import type { BroadcastMessageInput } from '@/modules/operations/application/schemas/admin.schema';
import { apiFetch } from '@shared/infrastructure/http/api-client';
import { useAdminMutation } from '@shared/application/useAdminMutation';
import { operationsKeys } from '@operations/application/operations.keys';

export interface BroadcastResponse {
  recipientsCount: number;
  message: string;
}

export function useBroadcastMutation() {
  return useAdminMutation<BroadcastResponse, BroadcastMessageInput>(
    async (data) => {
      const json = await apiFetch<any>('/api/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return json.data || json;
    },
    [operationsKeys.auditLogs()]
  );
}
