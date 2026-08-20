import { IAiAgentRepository, AiAgent } from '@betrix/domain';

export class ListAgentsUseCase {
  constructor(private readonly agentRepo: IAiAgentRepository) {}

  public async execute(activeOnly: boolean = true): Promise<AiAgent[]> {
    return this.agentRepo.findAll(activeOnly);
  }
}
