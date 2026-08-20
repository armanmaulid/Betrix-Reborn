import { Nullable, PaginatedResult, PaginationParams } from '@betrix/core';
import { User } from '../entities/User.js';

export interface IUserRepository {
  findById(id: string): Promise<Nullable<User>>;
  findByEmail(email: string): Promise<Nullable<User>>;
  findByGoogleId(googleId: string): Promise<Nullable<User>>;
  save(user: User): Promise<User>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<boolean>;
  updateCredits(id: string, newCredits: number): Promise<boolean>;
  updateStatus(id: string, status: 'active' | 'suspended' | 'banned'): Promise<boolean>;
  findAll(pagination: PaginationParams, search?: string): Promise<PaginatedResult<User>>;
}
