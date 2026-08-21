import { AuthenticationError, NotFoundError } from '@betrix/core';
import { IUserRepository, ISessionRepository, User } from '@betrix/domain';
import { AuthService } from '../../services/AuthService.js';
import { ChangePasswordDTO } from '../../schemas/auth.schema.js';

export class ChangePasswordUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly sessionRepo: ISessionRepository,
    private readonly authService: AuthService
  ) {}

  public async execute(
    userId: string,
    dto: ChangePasswordDTO,
    currentSessionToken?: string
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    if (user.passwordHash) {
      const isMatch = await this.authService.verifyPassword(dto.currentPassword, user.passwordHash);
      if (!isMatch) {
        throw new AuthenticationError('Current password is incorrect.');
      }
    }

    const newHash = await this.authService.hashPassword(dto.newPassword);
    const updatedUser = new User({
      ...user,
      passwordHash: newHash
    });

    await this.userRepo.update(updatedUser);

    // Revoke all sessions except the current one (stolen-password sessions die now)
    if (currentSessionToken) {
      const sessions = await this.sessionRepo.findByUserId(userId);
      for (const s of sessions) {
        if (s.token !== currentSessionToken) {
          await this.sessionRepo.delete(s.token);
        }
      }
    } else {
      await this.sessionRepo.deleteByUserId(userId);
    }

    return {
      success: true,
      message: 'Password successfully updated.'
    };
  }
}
