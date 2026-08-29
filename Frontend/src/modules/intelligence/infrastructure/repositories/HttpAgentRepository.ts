import type {
  IAgentRepository,
  CreateAgentInput,
  UpdateAgentInput,
  AgentTestPayload,
  AgentTestResult,
  TestAgentOptions
} from '../../domain/repositories/IAgentRepository';
import { AiAgent } from '../../domain/entities/AiAgent';
import { AgentMapper } from '../mappers/AgentMapper';
import { HttpClient, unwrapData, unwrapListData } from '@/shared/infrastructure/http/api-client';

export class HttpAgentRepository implements IAgentRepository {
  constructor(private client: HttpClient = new HttpClient()) {}

  async getAgents(): Promise<AiAgent[]> {
    const res = await this.client.get<{ data: unknown[] }>('/api/admin/agents');
    return AgentMapper.toDomainList(unwrapListData(res));
  }

  async getAgentById(id: string): Promise<AiAgent> {
    const res = await this.client.get<{ data: unknown }>(
      `/api/admin/agents/${encodeURIComponent(id)}`
    );
    return AgentMapper.toDomain(unwrapData(res));
  }

  async createAgent(input: CreateAgentInput): Promise<AiAgent> {
    const res = await this.client.post<{ data: unknown }>('/api/admin/agents', input);
    return AgentMapper.toDomain(unwrapData(res));
  }

  async updateAgent(id: string, input: UpdateAgentInput): Promise<AiAgent> {
    const res = await this.client.patch<{ data: unknown }>(
      `/api/admin/agents/${encodeURIComponent(id)}`,
      input
    );
    return AgentMapper.toDomain(unwrapData(res));
  }

  async setDefaultAgent(id: string): Promise<void> {
    await this.client.post(`/api/admin/agents/${encodeURIComponent(id)}/set-default`);
  }

  async deleteAgent(id: string): Promise<void> {
    await this.client.delete(`/api/admin/agents/${encodeURIComponent(id)}`);
  }

  async testAgent(
    id: string,
    payload: AgentTestPayload,
    options?: TestAgentOptions
  ): Promise<AgentTestResult> {
    const res = await this.client.post<{ data: AgentTestResult }>(
      `/api/admin/agents/${encodeURIComponent(id)}/test`,
      payload,
      { signal: options?.signal }
    );
    return res.data;
  }
}

export const agentRepository = new HttpAgentRepository();
