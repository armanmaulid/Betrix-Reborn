'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AiAgent } from '@/lib/types';
import type { CreateAgentInput, UpdateAgentInput } from '@/lib/schemas/agent.schema';

export function useAgentsQuery() {
  return useQuery<AiAgent[]>({
    queryKey: ['admin', 'agents'],
    queryFn: async () => {
      const res = await fetch('/api/admin/agents');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Failed to fetch AI agents (${res.status})`);
      }
      const json = await res.json();
      return json.data || json || [];
    }
  });
}

export function useAgentDetailQuery(agentId: string) {
  const { data: agents, isLoading, isError } = useAgentsQuery();
  const agent = agents?.find((a) => a.id === agentId);

  return {
    agent,
    isLoading,
    isError
  };
}

export function useCreateAgentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAgentInput) => {
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Failed to deploy AI agent');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
    }
  });
}

export function useUpdateAgentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAgentInput }) => {
      const res = await fetch(`/api/admin/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Failed to update AI agent parameters');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] });
    }
  });
}

export function useSetDefaultAgentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agentId: string) => {
      const res = await fetch(`/api/admin/agents/${agentId}/set-default`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Failed to set system default agent');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] });
    }
  });
}

export function useDeleteAgentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agentId: string) => {
      const res = await fetch(`/api/admin/agents/${agentId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Failed to purge AI agent');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
    }
  });
}

export function useTestAgentMutation() {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: import('@/lib/types').AgentTestPayload }) => {
      const res = await fetch(`/api/admin/agents/${encodeURIComponent(id)}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Agent test inference failed (${res.status})`);
      }
      const json = await res.json();
      return json.data as import('@/lib/types').AgentTestResult;
    }
  });
}

