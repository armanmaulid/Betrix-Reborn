'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { operationsRepository } from '@operations/infrastructure/repositories/HttpOperationsRepository';
import { operationsKeys } from '@operations/application/operations.keys';
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: WorkerAction }) =>
      operationsRepository.controlWorker(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: operationsKeys.workers() });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    }
  });
}
