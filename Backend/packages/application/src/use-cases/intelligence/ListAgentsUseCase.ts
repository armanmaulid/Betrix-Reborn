import { IAiAgentRepository, AgentFilter, AiAgent } from '@betrix/domain';

export class ListAgentsUseCase {
  constructor(private readonly agentRepo: IAiAgentRepository) {}

  public async execute(filter: AgentFilter | boolean = true): Promise<AiAgent[]> {
    return this.agentRepo.findAll(filter);
  }
}

