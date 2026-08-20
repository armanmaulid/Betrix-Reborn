import { IAiAgentRepository, AiAgent, NotFoundError } from '@betrix/domain';

export class GetAgentUseCase {
  constructor(private readonly agentRepo: IAiAgentRepository) {}

  public async execute(id: string): Promise<AiAgent> {
    const agent = await this.agentRepo.findById(id);
    if (!agent) {
      throw new NotFoundError(`AI Agent with ID '${id}' not found`);
    }
    return agent;
  }
}
