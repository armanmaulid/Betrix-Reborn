import { Nullable } from '@betrix/core';

export interface AiAgentProps {
  id: string;
  name: string;
  modelName: string;
  baseUrl?: Nullable<string>;
  apiKey?: Nullable<string>;
  taskType?: string;
  systemPrompt?: Nullable<string>;
  tier?: 'cheap' | 'balanced' | 'deep';
  creditsPer1kTokens?: number;
  maxTokens?: number;
  temperature?: number;
  supportsThinking?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
  description?: Nullable<string>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AiAgent {
  public readonly id: string;
  public readonly name: string;
  public readonly modelName: string;
  public readonly baseUrl: Nullable<string>;
  public readonly apiKey: Nullable<string>;
  public readonly taskType: string;
  public readonly systemPrompt: Nullable<string>;
  public readonly tier: 'cheap' | 'balanced' | 'deep';
  public readonly creditsPer1kTokens: number;
  public readonly maxTokens: number;
  public readonly temperature: number;
  public readonly supportsThinking: boolean;
  public readonly isDefault: boolean;
  public readonly isActive: boolean;
  public readonly description: Nullable<string>;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: AiAgentProps) {
    this.id = props.id.toLowerCase().trim();
    this.name = props.name;
    this.modelName = props.modelName;
    this.baseUrl = props.baseUrl ?? null;
    this.apiKey = props.apiKey ?? null;
    this.taskType = props.taskType ?? 'trade_reasoning';
    this.systemPrompt = props.systemPrompt ?? null;
    this.tier = props.tier ?? 'deep';
    this.creditsPer1kTokens = props.creditsPer1kTokens ?? 1;
    this.maxTokens = props.maxTokens ?? 8192;
    this.temperature = props.temperature ?? 70;
    this.supportsThinking = props.supportsThinking ?? true;
    this.isDefault = props.isDefault ?? false;
    this.isActive = props.isActive ?? true;
    this.description = props.description ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  /** Calculate credit cost for given total token usage */
  public calculateCredits(totalTokens: number): number {
    const tokensInThousands = totalTokens / 1000;
    const rawCost = tokensInThousands * this.creditsPer1kTokens;
    return Math.max(1, Math.ceil(rawCost));
  }

  /** True if this agent uses a custom gateway (not the default AI_BASE_URL) */
  public hasCustomGateway(): boolean {
    return this.baseUrl !== null && this.baseUrl !== undefined && this.baseUrl.length > 0;
  }

  /** True if this agent has a custom API key */
  public hasCustomApiKey(): boolean {
    return this.apiKey !== null && this.apiKey !== undefined && this.apiKey.length > 0;
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      modelName: this.modelName,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey ? '***' : null,
      taskType: this.taskType,
      systemPrompt: this.systemPrompt,
      tier: this.tier,
      creditsPer1kTokens: this.creditsPer1kTokens,
      maxTokens: this.maxTokens,
      temperature: this.temperature / 100,
      supportsThinking: this.supportsThinking,
      isDefault: this.isDefault,
      isActive: this.isActive,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
