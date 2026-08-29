import { AiAgent, type AiAgentProps } from '../../domain/entities/AiAgent';

export class AgentMapper {
  public static toDomain(dto: unknown): AiAgent {
    const d = dto as AiAgentProps;
    return new AiAgent({
      id: d.id,
      name: d.name,
      modelName: d.modelName,
      baseUrl: d.baseUrl,
      apiKey: d.apiKey,
      taskType: d.taskType || 'chat',
      systemPrompt: d.systemPrompt,
      tier: d.tier || 'balanced',
      creditsPer1kTokens: Number(d.creditsPer1kTokens || 10),
      maxTokens: Number(d.maxTokens || 4096),
      temperature: Number(d.temperature ?? 0.7),
      supportsThinking: Boolean(d.supportsThinking),
      isDefault: Boolean(d.isDefault),
      isActive: Boolean(d.isActive ?? true),
      visibility: d.visibility || 'public',
      description: d.description,
      createdAt: d.createdAt || new Date(),
      updatedAt: d.updatedAt
    });
  }

  public static toDomainList(list: unknown[]): AiAgent[] {
    if (!Array.isArray(list)) return [];
    return list.map(AgentMapper.toDomain);
  }
}
