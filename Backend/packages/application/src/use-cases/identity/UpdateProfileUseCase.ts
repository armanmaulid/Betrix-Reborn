import { NotFoundError } from '@betrix/core';
import { IUserRepository, User } from '@betrix/domain';
import { UpdateProfileDTO } from '../../schemas/auth.schema.js';

export class UpdateProfileUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  public async execute(userId: string, dto: UpdateProfileDTO): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const updatedUser = user.withUpdatedProfile({
      name: dto.name,
      phone: dto.phone,
      address: dto.address,
      birthdate: dto.birthdate,
      gender: dto.gender,
      bio: dto.bio
    });

    return this.userRepo.update(updatedUser);
  }
}
