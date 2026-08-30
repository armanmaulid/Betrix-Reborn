import { Value } from '@sinclair/typebox/value';
import {
  IAiAgentRepository,
  AiAgent,
  ConflictError,
  IAdminActionRepository,
  AdminAction
} from '@betrix/domain';
import { CreateAgentDto, CreateAgentSchema } from '../../schemas/agent.schema.js';

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
    // A1 — schema is the source of truth; Default fills defaults (visibility, temperature, etc.)
    const input = Value.Default(CreateAgentSchema, dto) as CreateAgentDto;
    const existing = await this.agentRepo.findById(input.id);
    if (existing) {
      throw new ConflictError(`AI Agent with ID '${dto.id}' already exists`);
    }

    const agent = new AiAgent({
      id: input.id,
      name: input.name,
      modelName: input.modelName,
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
      taskType: input.taskType,
      systemPrompt: input.systemPrompt,
      tier: input.tier,
      creditsPer1kTokens: input.creditsPer1kTokens,
      maxTokens: input.maxTokens,
      temperature: input.temperature !== undefined ? Math.round(input.temperature * 100) : 70,
      supportsThinking: input.supportsThinking,
      isDefault: input.isDefault,
      isActive: input.isActive,
      visibility: input.visibility,
      description: input.description
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
