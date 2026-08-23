import { IAiAgentRepository, NotFoundError, IAdminActionRepository, AdminAction } from '@betrix/domain';

export class SetDefaultAgentUseCase {
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

    const success = await this.agentRepo.setDefault(id);

    if (success && this.adminActionRepo && adminId) {
      await this.adminActionRepo.save(
        new AdminAction({
          id: crypto.randomUUID(),
          adminId,
          action: 'SET_DEFAULT_AGENT',
          targetType: 'ai_agent',
          targetId: id,
          details: { id, name: existing.name },
          ip: context?.ip,
          userAgent: context?.userAgent,
          createdAt: new Date()
        })
      );
    }

    return success;
  }
}
