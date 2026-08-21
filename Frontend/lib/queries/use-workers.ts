'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BackgroundWorkerInfo, WorkerAction } from '@/lib/types';

export function useWorkersQuery(refetchInterval: number | false = 5000) {
  return useQuery<BackgroundWorkerInfo[]>({
    queryKey: ['admin', 'workers'],
    queryFn: async () => {
      const res = await fetch('/api/admin/workers');
      if (!res.ok) {
        throw new Error(`Failed to fetch background workers: ${res.statusText}`);
      }
      const json = await res.json();
      return json.data || [];
    },
    refetchInterval,
    refetchIntervalInBackground: false,
    staleTime: 3000
  });
}

export function useControlWorkerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: WorkerAction }) => {
      const res = await fetch(`/api/admin/workers/${id}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || `Failed to ${action} worker.`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workers'] });
    }
  });
}
