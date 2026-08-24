import type {
  IUserRepository,
  UserQueryParams,
  CreateUserInput,
  CreateUserResult,
  UpdateUserInput
} from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { UserMapper } from '../mappers/UserMapper';
import { apiFetch, HttpClient } from '@shared/infrastructure/http/api-client';
import type { PaginatedResult } from '@shared/domain/types/Pagination';

export class HttpUserRepository implements IUserRepository {
  constructor(private client: HttpClient = new HttpClient()) {}

  async getUsers(params?: UserQueryParams): Promise<PaginatedResult<User>> {
    const res = await this.client.get<{ data: any[]; meta: any }>('/api/admin/users', {
      queryParams: params as Record<string, any>
    });
    return UserMapper.toDomainPaginated(res);
  }

  async getUserById(id: string): Promise<User> {
    const res = await this.client.get<{ data: { user: any } }>(`/api/admin/users/${encodeURIComponent(id)}`);
    const userData = res.data?.user || res.data || res;
    return UserMapper.toDomain(userData);
  }

  async createUser(input: CreateUserInput): Promise<CreateUserResult> {
    const res = await this.client.post<{
      data?: { user?: any; generatedPassword?: string };
      user?: any;
      generatedPassword?: string;
    }>('/api/admin/users', input);
    const body = res.data ?? res;
    return {
      user: UserMapper.toDomain(body.user ?? body),
      generatedPassword: body.generatedPassword
    };
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const res = await this.client.patch<{ data: any }>(`/api/admin/users/${encodeURIComponent(id)}`, input);
    return UserMapper.toDomain(res.data || res);
  }

  async deleteUser(id: string): Promise<void> {
    await this.client.delete(`/api/admin/users/${encodeURIComponent(id)}`);
  }

  async resetPassword(userId: string, newPassword?: string): Promise<{ temporaryPassword?: string }> {
    const res = await this.client.post<{ data?: { temporaryPassword?: string } }>(
      `/api/admin/users/${encodeURIComponent(userId)}/reset-password`,
      newPassword ? { newPassword } : {}
    );
    return res.data || {};
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.client.delete(`/api/admin/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(sessionId)}`);
  }

  async revokeAllSessions(userId: string): Promise<number> {
    const res = await this.client.delete<{ data?: { revokedCount?: number } }>(
      `/api/admin/users/${encodeURIComponent(userId)}/sessions`
    );
    return res.data?.revokedCount ?? 0;
  }

  async removeDevice(userId: string, deviceId: string): Promise<void> {
    await this.client.delete(`/api/admin/users/${encodeURIComponent(userId)}/devices/${encodeURIComponent(deviceId)}`);
  }
}

export const userRepository = new HttpUserRepository();
