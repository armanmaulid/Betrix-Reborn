import {
  IAiAgentRepository,
  NotFoundError,
  IAdminActionRepository,
  AdminAction
} from '@betrix/domain';

export class DeleteAgentUseCase {
  constructor(
    private readonly agentRepo: IAiAgentRepository,
    private readonly adminActionRepo?: IAdminActionRepository
  ) {}

  public async execute(
    adminId: string,
    id: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<boolean> {
    const existing = await this.agentRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`AI Agent with ID '${id}' not found`);
    }

    const deleted = await this.agentRepo.delete(id);

    if (deleted && this.adminActionRepo && adminId) {
      await this.adminActionRepo.save(
        new AdminAction({
          id: crypto.randomUUID(),
          adminId,
          action: 'DELETE_AGENT',
          targetType: 'ai_agent',
          targetId: id,
          details: { id, name: existing.name, modelName: existing.modelName },
          ip: context?.ip,
          userAgent: context?.userAgent,
          createdAt: new Date()
        })
      );
    }

    return deleted;
  }
}
