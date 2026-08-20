import { PaginatedResult, PaginationParams } from '@betrix/core';
import { IUserRepository, User } from '@betrix/domain';

export class GetAdminUsersUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  public async execute(pagination: PaginationParams, search?: string): Promise<PaginatedResult<User>> {
    return this.userRepo.findAll(pagination, search);
  }
}
