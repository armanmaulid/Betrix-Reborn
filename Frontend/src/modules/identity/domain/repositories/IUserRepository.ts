import { User } from '../entities/User';
import type { AdminUserDetail, AdminChatMessage, AdminChatHistoryQuery } from '../entities/User';
import type { PaginatedResult, PaginationQueryParams } from '@/shared/domain/types/Pagination';

export interface UserQueryParams extends PaginationQueryParams {
  status?: 'active' | 'suspended' | 'banned';
  tier?: string;
  isAdmin?: boolean;
}

export interface CreateUserInput {
  email: string;
  name?: string | null;
  password?: string;
  status?: 'active' | 'suspended' | 'banned';
  tier?: string;
  isAdmin?: boolean;
  credits?: number;
}

export interface CreateUserResult {
  user: User;
  generatedPassword?: string;
}

export interface UpdateUserInput {
  email?: string;
  name?: string | null;
  status?: 'active' | 'suspended' | 'banned';
  tier?: string;
  isAdmin?: boolean;
  credits?: number;
  phone?: string | null;
  address?: string | null;
  bio?: string | null;
}

export interface IUserRepository {
  getUsers(params?: UserQueryParams): Promise<PaginatedResult<User>>;
  getUserById(id: string): Promise<User>;
  getCurrentUserCredits(): Promise<number | null>;
  getUserDetail(id: string): Promise<AdminUserDetail>;
  getUserChatHistory(
    id: string,
    params?: AdminChatHistoryQuery
  ): Promise<PaginatedResult<AdminChatMessage>>;
  createUser(input: CreateUserInput): Promise<CreateUserResult>;
  updateUser(id: string, input: UpdateUserInput): Promise<User>;
  deleteUser(id: string): Promise<void>;
  resetPassword(userId: string, newPassword?: string): Promise<{ temporaryPassword?: string }>;
  revokeSession(userId: string, sessionId: string): Promise<void>;
  revokeAllSessions(userId: string): Promise<number>;
  removeDevice(userId: string, deviceId: string): Promise<void>;
}
