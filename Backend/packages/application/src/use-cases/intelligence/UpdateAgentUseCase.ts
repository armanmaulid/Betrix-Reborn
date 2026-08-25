import {
  IAiAgentRepository,
  AiAgent,
  NotFoundError,
  IAdminActionRepository,
  AdminAction
} from '@betrix/domain';
import { UpdateAgentDto } from '../../schemas/agent.schema.js';

export class UpdateAgentUseCase {
  constructor(
    private readonly agentRepo: IAiAgentRepository,
    private readonly adminActionRepo?: IAdminActionRepository
  ) {}

  public async execute(
    adminId: string,
    id: string,
    dto: UpdateAgentDto,
    context?: { ip?: string; userAgent?: string }
  ): Promise<AiAgent> {
    const existing = await this.agentRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`AI Agent with ID '${id}' not found`);
    }

    const updated = new AiAgent({
      id: existing.id,
      name: dto.name ?? existing.name,
      modelName: dto.modelName ?? existing.modelName,
      baseUrl: dto.baseUrl !== undefined ? dto.baseUrl : existing.baseUrl,
      apiKey: dto.apiKey !== undefined ? dto.apiKey : existing.apiKey,
      taskType: dto.taskType ?? existing.taskType,
      systemPrompt: dto.systemPrompt !== undefined ? dto.systemPrompt : existing.systemPrompt,
      tier: dto.tier ?? existing.tier,
      creditsPer1kTokens: dto.creditsPer1kTokens ?? existing.creditsPer1kTokens,
      maxTokens: dto.maxTokens ?? existing.maxTokens,
      temperature:
        dto.temperature !== undefined ? Math.round(dto.temperature * 100) : existing.temperature,
      supportsThinking:
        dto.supportsThinking !== undefined ? dto.supportsThinking : existing.supportsThinking,
      isDefault: dto.isDefault !== undefined ? dto.isDefault : existing.isDefault,
      isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive,
      visibility: dto.visibility !== undefined ? dto.visibility : existing.visibility,
      description: dto.description !== undefined ? dto.description : existing.description,
      createdAt: existing.createdAt,
      updatedAt: new Date()
    });

    const saved = await this.agentRepo.save(updated);

    if (this.adminActionRepo) {
      await this.adminActionRepo.save(
        new AdminAction({
          id: crypto.randomUUID(),
          adminId,
          action: 'UPDATE_AGENT',
          targetType: 'ai_agent',
          targetId: id,
          details: {
            changes: Object.keys(dto).filter((k) => (dto as any)[k] !== undefined)
          },
          ip: context?.ip,
          userAgent: context?.userAgent,
          createdAt: new Date()
        })
      );
    }

    return saved;
  }
}
