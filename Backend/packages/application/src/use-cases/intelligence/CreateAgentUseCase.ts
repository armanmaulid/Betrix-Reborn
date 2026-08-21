import { IAiAgentRepository, AiAgent, ConflictError } from '@betrix/domain';
import { CreateAgentDto } from '../../schemas/agent.schema.js';

export class CreateAgentUseCase {
  constructor(private readonly agentRepo: IAiAgentRepository) {}

  public async execute(dto: CreateAgentDto): Promise<AiAgent> {
    const existing = await this.agentRepo.findById(dto.id);
    if (existing) {
      throw new ConflictError(`AI Agent with ID '${dto.id}' already exists`);
    }

    const agent = new AiAgent({
      id: dto.id,
      name: dto.name,
      modelName: dto.modelName,
      baseUrl: dto.baseUrl,
      apiKey: dto.apiKey,
      taskType: dto.taskType,
      systemPrompt: dto.systemPrompt,
      tier: dto.tier,
      creditsPer1kTokens: dto.creditsPer1kTokens,
      maxTokens: dto.maxTokens,
      temperature: dto.temperature !== undefined ? Math.round(dto.temperature * 100) : 70,
      supportsThinking: dto.supportsThinking,
      isDefault: dto.isDefault,
      isActive: dto.isActive,
      visibility: dto.visibility ?? 'public',
      description: dto.description
    });

    return this.agentRepo.save(agent);
  }
}
