import { IAiAgentRepository, IAiGateway, NotFoundError } from '@betrix/domain';
import { TestAgentDto } from '../../schemas/agent.schema.js';

export interface TestAgentResult {
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

export class TestAgentUseCase {
  constructor(
    private readonly agentRepo: IAiAgentRepository,
    private readonly aiGateway: IAiGateway
  ) {}

  public async execute(agentId: string, dto: TestAgentDto): Promise<TestAgentResult> {
    const agent = await this.agentRepo.findById(agentId);
    if (!agent) {
      throw new NotFoundError(`AI Agent with ID '${agentId}' not found`);
    }

    const systemPrompt =
      dto.systemPromptOverride !== undefined && dto.systemPromptOverride !== null
        ? dto.systemPromptOverride
        : agent.systemPrompt ||
          'You are an institutional financial AI specialized in risk management.';

    const temperature =
      dto.temperatureOverride !== undefined ? dto.temperatureOverride : agent.temperature / 100;

    const maxTokens = dto.maxTokensOverride ?? agent.maxTokens;

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: dto.message }
    ];

    const response = await this.aiGateway.complete({
      model: agent.modelName,
      messages,
      temperature,
      maxTokens,
      baseUrl: agent.baseUrl || undefined,
      apiKey: agent.apiKey || undefined
    });

    return {
      agentId: agent.id,
      agentName: agent.name,
      modelUsed: agent.modelName,
      reply: response.reply,
      thinking: response.thinking,
      usage: {
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        totalTokens: response.inputTokens + response.outputTokens,
        latencyMs: response.latencyMs
      }
    };
  }
}
