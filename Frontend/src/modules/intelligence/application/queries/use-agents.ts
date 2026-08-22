'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentRepository } from '@intelligence/infrastructure/repositories/HttpAgentRepository';
import { intelligenceKeys } from '@intelligence/application/intelligence.keys';
import type { AiAgent } from '@intelligence/domain/entities/AiAgent';
import type { CreateAgentInput, UpdateAgentInput, AgentTestPayload, AgentTestResult } from '@intelligence/domain/repositories/IAgentRepository';

export function useAgentsQuery() {
  return useQuery<AiAgent[]>({
    queryKey: intelligenceKeys.agents(),
    queryFn: () => agentRepository.getAgents()
  });
}

export function useAgentDetailQuery(agentId: string) {
  return useQuery<AiAgent>({
    queryKey: intelligenceKeys.agentDetail(agentId),
    queryFn: () => agentRepository.getAgentById(agentId),
    enabled: Boolean(agentId)
  });
}

export function useCreateAgentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAgentInput) => agentRepository.createAgent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intelligenceKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    }
  });
}

export function useUpdateAgentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAgentInput }) =>
      agentRepository.updateAgent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intelligenceKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    }
  });
}

export function useSetDefaultAgentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agentId: string) => agentRepository.setDefaultAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intelligenceKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    }
  });
}

export function useDeleteAgentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agentId: string) => agentRepository.deleteAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intelligenceKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    }
  });
}

export function useTestAgentMutation() {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AgentTestPayload }) =>
      agentRepository.testAgent(id, payload)
  });
}
