import { generateSecureToken } from '@betrix/core';
import { IUserRepository, IVerificationRepository } from '@betrix/domain';
import { ForgotPasswordDTO } from '../../schemas/auth.schema.js';
import { logger } from '../../logger.js';

export interface IResetPasswordEmailDispatcher {
  sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean>;
}

export class ForgotPasswordUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly verificationRepo: IVerificationRepository,
    private readonly emailService?: IResetPasswordEmailDispatcher,
    private readonly isDevMode: boolean = false
  ) {}

  public async execute(
    dto: ForgotPasswordDTO
  ): Promise<{ success: boolean; message: string; resetToken?: string }> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      // Prevent user enumeration
      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent.'
      };
    }

    await this.verificationRepo.invalidateUserTokens(user.id, 'password_reset');

    const resetToken = generateSecureToken(32);
    await this.verificationRepo.create(user.id, resetToken, 'password_reset', 60); // 1 hour TTL

    if (this.emailService) {
      const resetLink = `https://betrix.io/reset-password?token=${resetToken}`;
      await this.emailService.sendPasswordResetEmail(email, resetLink).catch((err) => {
        logger.warn(
          `[ForgotPasswordUseCase] Failed to send password reset email (recipient omitted): ${err.message}`
        );
      });
    }

    return {
      success: true,
      message: 'If the email exists, a password reset link has been sent.',
      resetToken: this.isDevMode ? resetToken : undefined
    };
  }
}
