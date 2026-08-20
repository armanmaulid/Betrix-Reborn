import { randomUUID } from 'node:crypto';
import { NotFoundError } from '@betrix/core';
import { IUserRepository, IAdminActionRepository, AdminAction } from '@betrix/domain';

export class DeleteAdminUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly adminActionRepo: IAdminActionRepository
  ) {}

  public async execute(
    adminId: string,
    targetUserId: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<{ success: boolean }> {
    const user = await this.userRepo.findById(targetUserId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const deleted = await this.userRepo.delete(targetUserId);

    const action = new AdminAction({
      id: randomUUID(),
      adminId,
      action: 'DELETE_USER',
      targetType: 'user',
      targetId: targetUserId,
      details: { email: user.email, name: user.name },
      ip: context?.ip,
      userAgent: context?.userAgent,
      createdAt: new Date()
    });

    await this.adminActionRepo.save(action);

    return { success: deleted };
  }
}
