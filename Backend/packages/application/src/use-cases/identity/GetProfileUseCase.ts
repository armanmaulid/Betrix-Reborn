import { NotFoundError } from '@betrix/core';
import { IUserRepository, User } from '@betrix/domain';

export class GetProfileUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  public async execute(userId: string): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    return user;
  }
}
