import { randomUUID } from 'node:crypto';
import { NotFoundError, hashPassword } from '@betrix/core';
import {
  IUserRepository,
  ISessionRepository,
  IAdminActionRepository,
  AdminAction,
  User
} from '@betrix/domain';
import { ResetUserPasswordDTO } from '../../schemas/admin.schema.js';

export class ResetUserPasswordUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly sessionRepo: ISessionRepository,
    private readonly adminActionRepo: IAdminActionRepository
  ) {}

  public async execute(
    adminId: string,
    targetUserId: string,
    dto: ResetUserPasswordDTO,
    context?: { ip?: string; userAgent?: string }
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepo.findById(targetUserId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const passwordHash = await hashPassword(dto.newPassword);
    const updatedUser = new User({
      ...user,
      passwordHash
    });

    await this.userRepo.update(updatedUser);
    await this.sessionRepo.deleteByUserId(targetUserId);

    const action = new AdminAction({
      id: randomUUID(),
      adminId,
      action: 'RESET_USER_PASSWORD',
      targetType: 'user',
      targetId: targetUserId,
      details: { email: user.email },
      ip: context?.ip,
      userAgent: context?.userAgent,
      createdAt: new Date()
    });

    await this.adminActionRepo.save(action);

    return {
      success: true,
      message: `Password for ${user.email} successfully reset.`
    };
  }
}
