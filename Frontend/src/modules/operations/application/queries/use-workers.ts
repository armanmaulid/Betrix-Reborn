'use client';

import { useQuery } from '@tanstack/react-query';
import { operationsRepository } from '@operations/infrastructure/repositories/HttpOperationsRepository';
import { operationsKeys } from '@operations/application/operations.keys';
import { useAdminMutation } from '@shared/application/useAdminMutation';
import type { BackgroundWorker, WorkerAction } from '@operations/domain/entities/BackgroundWorker';

export function useWorkersQuery(refetchInterval: number | false = 5000) {
  return useQuery<BackgroundWorker[]>({
    queryKey: operationsKeys.workers(),
    queryFn: () => operationsRepository.getWorkers(),
    refetchInterval,
    refetchIntervalInBackground: false,
    staleTime: 3000
  });
}

export function useControlWorkerMutation() {
  return useAdminMutation(
    ({ id, action }: { id: string; action: WorkerAction }) =>
      operationsRepository.controlWorker(id, action),
    [operationsKeys.workers()]
  );
}
