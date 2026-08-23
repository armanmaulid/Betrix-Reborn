import { IAiAgentRepository, AiAgent, ConflictError, IAdminActionRepository, AdminAction } from '@betrix/domain';
import { CreateAgentDto } from '../../schemas/agent.schema.js';

export class CreateAgentUseCase {
  constructor(
    private readonly agentRepo: IAiAgentRepository,
    private readonly adminActionRepo?: IAdminActionRepository
  ) {}

  public async execute(
    dto: CreateAgentDto,
    adminId?: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<AiAgent> {
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

    const saved = await this.agentRepo.save(agent);

    if (this.adminActionRepo && adminId) {
      await this.adminActionRepo.save(
        new AdminAction({
          id: crypto.randomUUID(),
          adminId,
          action: 'CREATE_AGENT',
          targetType: 'ai_agent',
          targetId: dto.id,
          details: { id: dto.id, name: dto.name, modelName: dto.modelName, tier: dto.tier },
          ip: context?.ip,
          userAgent: context?.userAgent,
          createdAt: new Date()
        })
      );
    }

    return saved;
  }
}
