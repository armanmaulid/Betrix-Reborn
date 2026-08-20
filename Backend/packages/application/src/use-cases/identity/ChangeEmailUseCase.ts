import { AuthenticationError, ConflictError, NotFoundError } from '@betrix/core';
import { IUserRepository, User } from '@betrix/domain';
import { AuthService } from '../../services/AuthService.js';
import { ChangeEmailDTO } from '../../schemas/auth.schema.js';

export class ChangeEmailUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly authService: AuthService
  ) {}

  public async execute(userId: string, dto: ChangeEmailDTO): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    if (user.passwordHash) {
      const isMatch = await this.authService.verifyPassword(dto.password, user.passwordHash);
      if (!isMatch) {
        throw new AuthenticationError('Password is incorrect.');
      }
    }

    const newEmail = dto.newEmail.toLowerCase().trim();
    const existing = await this.userRepo.findByEmail(newEmail);
    if (existing && existing.id !== userId) {
      throw new ConflictError('This email is already in use by another account.');
    }

    const updatedUser = new User({
      ...user,
      email: newEmail,
      emailVerified: false,
      verifiedAt: null
    });

    await this.userRepo.update(updatedUser);

    return {
      success: true,
      message: 'Email address updated. Please verify your new email.'
    };
  }
}
