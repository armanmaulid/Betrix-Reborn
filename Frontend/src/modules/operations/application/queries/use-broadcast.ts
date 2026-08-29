'use client';

import type { BroadcastMessageInput } from '@/modules/operations/application/schemas/admin.schema';
import { operationsRepository } from '@/modules/operations/infrastructure/repositories/HttpOperationsRepository';
import { useAdminMutation } from '@/shared/application/useAdminMutation';
import { operationsKeys } from '@/modules/operations/application/operations.keys';

export interface BroadcastResponse {
  recipientsCount: number;
}

export function useBroadcastMutation() {
  return useAdminMutation<BroadcastResponse, BroadcastMessageInput>(
    (data) => operationsRepository.broadcastMessage(data),
    [operationsKeys.auditLogs()]
  );
}
