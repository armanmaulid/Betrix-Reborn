import { IAiAgentRepository, NotFoundError } from '@betrix/domain';

export class DeleteAgentUseCase {
  constructor(private readonly agentRepo: IAiAgentRepository) {}

  public async execute(id: string): Promise<boolean> {
    const existing = await this.agentRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`AI Agent with ID '${id}' not found`);
    }
    return this.agentRepo.delete(id);
  }
}
