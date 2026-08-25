import { AiAgent } from '../../domain/entities/AiAgent';

export class AgentMapper {
  public static toDomain(dto: any): AiAgent {
    return new AiAgent({
      id: dto.id,
      name: dto.name,
      modelName: dto.modelName,
      baseUrl: dto.baseUrl,
      apiKey: dto.apiKey,
      taskType: dto.taskType || 'chat',
      systemPrompt: dto.systemPrompt,
      tier: dto.tier || 'balanced',
      creditsPer1kTokens: Number(dto.creditsPer1kTokens || 10),
      maxTokens: Number(dto.maxTokens || 4096),
      temperature: Number(dto.temperature ?? 0.7),
      supportsThinking: Boolean(dto.supportsThinking),
      isDefault: Boolean(dto.isDefault),
      isActive: Boolean(dto.isActive ?? true),
      visibility: dto.visibility || 'public',
      description: dto.description,
      createdAt: dto.createdAt || new Date(),
      updatedAt: dto.updatedAt
    });
  }

  public static toDomainList(list: any[]): AiAgent[] {
    if (!Array.isArray(list)) return [];
    return list.map(AgentMapper.toDomain);
  }
}
