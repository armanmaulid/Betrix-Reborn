import { randomUUID } from 'node:crypto';
import { NotFoundError, ForbiddenError } from '@betrix/core';
import { IUserRepository, IAdminActionRepository, ISessionRepository, AdminAction, User } from '@betrix/domain';
import { UpdateAdminUserDTO } from '../../schemas/admin.schema.js';

export class UpdateAdminUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly adminActionRepo: IAdminActionRepository,
    private readonly sessionRepo: ISessionRepository
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

    const isEditingSelf = adminId === targetUserId;

    // 1. Guard against Self-Demotion (Admin cannot revoke own Admin role)
    if (isEditingSelf && dto.isAdmin !== undefined && !dto.isAdmin && user.isAdmin) {
      throw new ForbiddenError(
        'SELF_DEMOTION_FORBIDDEN: Administrators cannot revoke their own administrator privileges.'
      );
    }

    // 2. Guard against Self-Lockout (Admin cannot suspend or ban their own active account)
    if (isEditingSelf && dto.status !== undefined && dto.status !== 'active') {
      throw new ForbiddenError(
        'SELF_LOCKOUT_FORBIDDEN: Administrators cannot suspend or ban their own active account.'
      );
    }

    // Never spread stale fields back — only update what the DTO sets.
    const updatedUser = new User({
      ...user,
      name: dto.name !== undefined ? dto.name : user.name,
      isAdmin: dto.isAdmin !== undefined ? dto.isAdmin : user.isAdmin,
      status: dto.status !== undefined ? dto.status : user.status,
      tier: dto.tier !== undefined ? dto.tier : user.tier
    });

    let saved = await this.userRepo.update(updatedUser);

    // Credits updated separately to avoid lost-update race on balance
    if (dto.credits !== undefined) {
      await this.userRepo.updateCredits(targetUserId, dto.credits);
      saved = new User({ ...saved, credits: dto.credits });
    }

    // Ban/suspend/demotion take effect immediately — kill existing sessions
    const accessRevoked =
      (dto.status !== undefined && dto.status !== 'active') ||
      (dto.isAdmin !== undefined && !dto.isAdmin && user.isAdmin);
    if (accessRevoked) {
      await this.sessionRepo.deleteByUserId(targetUserId);
    }

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
