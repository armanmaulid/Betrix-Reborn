export type AgentTier = 'cheap' | 'balanced' | 'deep';
export type AgentVisibility = 'public' | 'private';

export interface AiAgentProps {
  id: string;
  name: string;
  modelName: string;
  baseUrl?: string | null;
  apiKey?: string | null;
  taskType: string;
  systemPrompt?: string | null;
  tier: AgentTier;
  creditsPer1kTokens: number;
  maxTokens: number;
  temperature: number;
  supportsThinking: boolean;
  isDefault: boolean;
  isActive: boolean;
  visibility: AgentVisibility;
  description?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

/** Flat agent interface for presentation layer */
export type AgentDetail = AiAgentProps & {
  calculateEstimatedCredits?: (tokens: number) => number;
  getTierBadgeVariant?: () => 'positive' | 'info' | 'accent';
};

export class AiAgent {
  public readonly id: string;
  public readonly name: string;
  public readonly modelName: string;
  public readonly baseUrl: string | null;
  public readonly apiKey: string | null;
  public readonly taskType: string;
  public readonly systemPrompt: string | null;
  public readonly tier: AgentTier;
  public readonly creditsPer1kTokens: number;
  public readonly maxTokens: number;
  public readonly temperature: number;
  public readonly supportsThinking: boolean;
  public readonly isDefault: boolean;
  public readonly isActive: boolean;
  public readonly visibility: AgentVisibility;
  public readonly description: string | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date | null;

  constructor(props: AiAgentProps) {
    this.id = props.id;
    this.name = props.name;
    this.modelName = props.modelName;
    this.baseUrl = props.baseUrl ?? null;
    this.apiKey = props.apiKey ?? null;
    this.taskType = props.taskType;
    this.systemPrompt = props.systemPrompt ?? null;
    this.tier = props.tier;
    this.creditsPer1kTokens = Math.max(0, props.creditsPer1kTokens || 0);
    this.maxTokens = Math.max(1, props.maxTokens || 4096);
    this.temperature = Math.min(2.0, Math.max(0.0, props.temperature ?? 0.7));
    this.supportsThinking = Boolean(props.supportsThinking);
    this.isDefault = Boolean(props.isDefault);
    this.isActive = Boolean(props.isActive);
    this.visibility = props.visibility || 'public';
    this.description = props.description ?? null;
    this.createdAt = typeof props.createdAt === 'string' ? new Date(props.createdAt) : props.createdAt;
    this.updatedAt = props.updatedAt
      ? typeof props.updatedAt === 'string'
        ? new Date(props.updatedAt)
        : props.updatedAt
      : null;
  }

  public calculateEstimatedCredits(tokens: number): number {
    return Math.ceil((Math.max(0, tokens) / 1000) * this.creditsPer1kTokens);
  }

  public getTierBadgeVariant(): 'positive' | 'info' | 'accent' {
    switch (this.tier) {
      case 'cheap':
        return 'positive';
      case 'balanced':
        return 'info';
      case 'deep':
        return 'accent';
    }
  }
}
