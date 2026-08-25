'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { agentRepository } from '@intelligence/infrastructure/repositories/HttpAgentRepository';
import { intelligenceKeys } from '@intelligence/application/intelligence.keys';
import { useAdminMutation } from '@shared/application/useAdminMutation';
import type { AiAgent } from '@intelligence/domain/entities/AiAgent';
import type {
  CreateAgentInput,
  UpdateAgentInput,
  AgentTestPayload,
  AgentTestResult
} from '@intelligence/domain/repositories/IAgentRepository';

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
  return useAdminMutation(
    (data: CreateAgentInput) => agentRepository.createAgent(data),
    [intelligenceKeys.all]
  );
}

export function useUpdateAgentMutation() {
  return useAdminMutation(
    ({ id, data }: { id: string; data: UpdateAgentInput }) => agentRepository.updateAgent(id, data),
    [intelligenceKeys.all]
  );
}

export function useSetDefaultAgentMutation() {
  return useAdminMutation(
    (agentId: string) => agentRepository.setDefaultAgent(agentId),
    [intelligenceKeys.all]
  );
}

export function useDeleteAgentMutation() {
  return useAdminMutation(
    (agentId: string) => agentRepository.deleteAgent(agentId),
    [intelligenceKeys.all]
  );
}

export function useTestAgentMutation() {
  return useMutation({
    mutationFn: ({
      id,
      payload,
      signal
    }: {
      id: string;
      payload: AgentTestPayload;
      signal?: AbortSignal;
    }) => agentRepository.testAgent(id, payload, { signal })
  });
}
