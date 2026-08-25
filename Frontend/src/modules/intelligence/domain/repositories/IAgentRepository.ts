import { AiAgent } from '../entities/AiAgent';

export interface CreateAgentInput {
  id?: string;
  name: string;
  modelName: string;
  baseUrl?: string | null;
  apiKey?: string | null;
  taskType?: string;
  systemPrompt?: string | null;
  tier?: 'cheap' | 'balanced' | 'deep';
  creditsPer1kTokens?: number;
  maxTokens?: number;
  temperature?: number;
  supportsThinking?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
  visibility?: 'public' | 'private';
  description?: string | null;
}

export type UpdateAgentInput = Partial<CreateAgentInput>;

export interface AgentTestPayload {
  message: string;
  systemPromptOverride?: string | null;
  temperatureOverride?: number;
  maxTokensOverride?: number;
}

export interface AgentTestResult {
  agentId: string;
  agentName: string;
  modelUsed: string;
  reply: string;
  thinking?: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    latencyMs: number;
  };
}

export interface TestAgentOptions {
  signal?: AbortSignal;
}

export interface IAgentRepository {
  getAgents(): Promise<AiAgent[]>;
  getAgentById(id: string): Promise<AiAgent>;
  createAgent(input: CreateAgentInput): Promise<AiAgent>;
  updateAgent(id: string, input: UpdateAgentInput): Promise<AiAgent>;
  setDefaultAgent(id: string): Promise<void>;
  deleteAgent(id: string): Promise<void>;
  testAgent(
    id: string,
    payload: AgentTestPayload,
    options?: TestAgentOptions
  ): Promise<AgentTestResult>;
}
