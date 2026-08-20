import { randomUUID } from 'node:crypto';
import { NotFoundError } from '@betrix/core';
import { IUserRepository, IAdminActionRepository, AdminAction, User } from '@betrix/domain';
import { UpdateAdminUserDTO } from '../../schemas/admin.schema.js';

export class UpdateAdminUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly adminActionRepo: IAdminActionRepository
  ) {}

  public async execute(
    adminId: string,
    targetUserId: string,
    dto: UpdateAdminUserDTO,
    context?: { ip?: string; userAgent?: string }
  ): Promise<User> {
    const user = await this.userRepo.findById(targetUserId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const updatedUser = new User({
      ...user,
      name: dto.name !== undefined ? dto.name : user.name,
      isAdmin: dto.isAdmin !== undefined ? dto.isAdmin : user.isAdmin,
      status: dto.status !== undefined ? dto.status : user.status,
      credits: dto.credits !== undefined ? dto.credits : user.credits
    });

    const saved = await this.userRepo.update(updatedUser);

    // Record audit action
    const action = new AdminAction({
      id: randomUUID(),
      adminId,
      action: 'UPDATE_USER',
      targetType: 'user',
      targetId: targetUserId,
      details: dto,
      ip: context?.ip,
      userAgent: context?.userAgent,
      createdAt: new Date()
    });

    await this.adminActionRepo.save(action);

    return saved;
  }
}
