import { IAiAgentRepository, ModelPolicy, ModelConfig } from '@betrix/domain';

export class ListModelsUseCase {
  constructor(
    private readonly agentRepo?: IAiAgentRepository,
    private readonly defaultModel: string = 'dahono/deepseek-v4-pro-0813'
  ) {}

  public async execute(): Promise<any[]> {
    if (this.agentRepo) {
      const agents = await this.agentRepo.findAll({ activeOnly: true, visibility: 'public' });
      if (agents.length > 0) {
        return agents.map((agent) => ({
          id: agent.id,
          name: agent.name,
          modelName: agent.modelName,
          taskType: agent.taskType,
          systemPrompt: agent.systemPrompt,
          tier: agent.tier,
          creditsPer1kTokens: agent.creditsPer1kTokens,
          maxTokens: agent.maxTokens,
          temperature: agent.temperature / 100,
          supportsThinking: agent.supportsThinking,
          isDefault: agent.isDefault,
          isActive: agent.isActive,
          visibility: agent.visibility,
          description: agent.description || `Dynamic AI Agent: ${agent.name}`
        }));
      }
    }
    return ModelPolicy.listModels(this.defaultModel);
  }
}
