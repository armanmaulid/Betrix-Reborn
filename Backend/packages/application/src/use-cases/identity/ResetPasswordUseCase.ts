import { ValidationError, NotFoundError } from '@betrix/core';
import {
  IUserRepository,
  IVerificationRepository,
  ISessionRepository,
  User
} from '@betrix/domain';
import { AuthService } from '../../services/AuthService.js';
import { ResetPasswordDTO } from '../../schemas/auth.schema.js';

export class ResetPasswordUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly verificationRepo: IVerificationRepository,
    private readonly sessionRepo: ISessionRepository,
    private readonly authService: AuthService
  ) {}

  public async execute(dto: ResetPasswordDTO): Promise<{ success: boolean; message: string }> {
    const record = await this.verificationRepo.verify(dto.token, 'password_reset');
    if (!record) {
      throw new ValidationError('Invalid or expired password reset token.');
    }

    const user = await this.userRepo.findById(record.userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const passwordHash = await this.authService.hashPassword(dto.newPassword);
    const updatedUser = new User({
      ...user,
      passwordHash
    });

    await this.userRepo.update(updatedUser);
    await this.verificationRepo.invalidateUserTokens(user.id, 'password_reset');
    // Invalidate all existing sessions for security
    await this.sessionRepo.deleteByUserId(user.id);

    return {
      success: true,
      message: 'Password has been successfully reset. Please log in with your new password.'
    };
  }
}
