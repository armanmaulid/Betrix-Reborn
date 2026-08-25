import { ValidationError, NotFoundError } from '@betrix/core';
import { IUserRepository, IVerificationRepository } from '@betrix/domain';
import { VerifyEmailDTO } from '../../schemas/auth.schema.js';

export class VerifyEmailUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly verificationRepo: IVerificationRepository
  ) {}

  public async execute(dto: VerifyEmailDTO): Promise<{ success: boolean; message: string }> {
    const record = await this.verificationRepo.verify(dto.token, 'email_verification');
    if (!record) {
      throw new ValidationError('Invalid or expired verification token.');
    }

    const user = await this.userRepo.findById(record.userId);
    if (!user) {
      throw new NotFoundError('User associated with this token was not found.');
    }

    const updatedUser = user.withEmailVerified();

    await this.userRepo.update(updatedUser);
    await this.verificationRepo.invalidateUserTokens(user.id, 'email_verification');

    return {
      success: true,
      message: 'Email successfully verified.'
    };
  }
}
