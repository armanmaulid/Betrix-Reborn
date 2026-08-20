import { generateSecureToken, NotFoundError, ValidationError } from '@betrix/core';
import { IUserRepository, IVerificationRepository } from '@betrix/domain';
import { ResendVerificationDTO } from '../../schemas/auth.schema.js';
import { IEmailDispatcher } from './RegisterUseCase.js';

export class ResendVerificationUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly verificationRepo: IVerificationRepository,
    private readonly emailService?: IEmailDispatcher,
    private readonly isDevMode: boolean = false
  ) {}

  public async execute(
    dto: ResendVerificationDTO
  ): Promise<{ success: boolean; message: string; verificationToken?: string }> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      // Avoid user enumeration
      return {
        success: true,
        message: 'If the email exists, a new verification link has been sent.'
      };
    }

    if (user.emailVerified) {
      throw new ValidationError('This email address is already verified.');
    }

    await this.verificationRepo.invalidateUserTokens(user.id, 'email_verification');

    const vToken = generateSecureToken(32);
    await this.verificationRepo.create(user.id, vToken, 'email_verification', 60 * 24);

    if (this.emailService) {
      const link = `https://betrix.io/verify-email?token=${vToken}`;
      await this.emailService.sendVerificationEmail(email, link, user.name || undefined).catch((err) => {
        console.warn(`[ResendVerificationUseCase] Failed to send email to ${email}:`, err.message);
      });
    }

    return {
      success: true,
      message: 'If the email exists, a new verification link has been sent.',
      verificationToken: this.isDevMode ? vToken : undefined
    };
  }
}
