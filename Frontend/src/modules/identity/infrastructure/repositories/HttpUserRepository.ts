import type {
  IUserRepository,
  UserQueryParams,
  CreateUserInput,
  CreateUserResult,
  UpdateUserInput
} from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import type {
  AdminUser,
  AdminUserDetail,
  AdminChatMessage,
  AdminChatHistoryQuery
} from '../../domain/entities/User';
import { UserMapper } from '../mappers/UserMapper';
import { HttpClient, unwrapData } from '@/shared/infrastructure/http/api-client';
import type { PaginatedResult, PaginationMeta } from '@/shared/domain/types/Pagination';

export class HttpUserRepository implements IUserRepository {
  constructor(private client: HttpClient = new HttpClient()) {}

  async getUsers(params?: UserQueryParams): Promise<PaginatedResult<User>> {
    const res = await this.client.get<{ data: AdminUser[]; meta: PaginationMeta }>(
      '/api/admin/users',
      {
        queryParams: params as Record<string, string | number | boolean | undefined>
      }
    );
    return UserMapper.toDomainPaginated(res);
  }

  async getUserById(id: string): Promise<User> {
    const res = await this.client.get<{ data: { user: AdminUser } }>(
      `/api/admin/users/${encodeURIComponent(id)}`
    );
    const userData = res.data?.user || unwrapData<AdminUser>(res);
    return UserMapper.toDomain(userData);
  }

  async getCurrentUserCredits(): Promise<number | null> {
    const res = await this.client.get<{ data?: { user?: { credits?: number } } }>(
      '/api/auth/session'
    );
    const credits = res.data?.user?.credits;
    return typeof credits === 'number' ? credits : null;
  }

  async getUserDetail(id: string): Promise<AdminUserDetail> {
    const res = await this.client.get<{ data: AdminUserDetail }>(
      `/api/admin/users/${encodeURIComponent(id)}`
    );
    return res.data || (res as unknown as AdminUserDetail);
  }

  async getUserChatHistory(
    id: string,
    params?: AdminChatHistoryQuery
  ): Promise<PaginatedResult<AdminChatMessage>> {
    const queryParams: Record<string, string | number | undefined> = {
      page: params?.page,
      limit: params?.limit,
      sessionId: params?.sessionId
    };
    const res = await this.client.get<{
      data: AdminChatMessage[] | AdminChatMessage;
      meta?: PaginatedResult<AdminChatMessage>['meta'];
    }>(`/api/admin/users/${encodeURIComponent(id)}/chat-history`, { queryParams });
    return UserMapper.toChatHistoryPaginated(res, params);
  }

  async createUser(input: CreateUserInput): Promise<CreateUserResult> {
    const res = await this.client.post<{
      data?: { user?: AdminUser; generatedPassword?: string };
      user?: AdminUser;
      generatedPassword?: string;
    }>('/api/admin/users', input);
    const body = res.data ?? res;
    return {
      user: UserMapper.toDomain(body.user ?? (body as unknown as AdminUser)),
      generatedPassword: body.generatedPassword
    };
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const res = await this.client.patch<{ data: AdminUser }>(
      `/api/admin/users/${encodeURIComponent(id)}`,
      input
    );
    return UserMapper.toDomain(unwrapData<AdminUser>(res));
  }

  async deleteUser(id: string): Promise<void> {
    await this.client.delete(`/api/admin/users/${encodeURIComponent(id)}`);
  }

  async resetPassword(
    userId: string,
    newPassword?: string
  ): Promise<{ temporaryPassword?: string }> {
    const res = await this.client.post<{ data?: { temporaryPassword?: string } }>(
      `/api/admin/users/${encodeURIComponent(userId)}/reset-password`,
      newPassword ? { newPassword } : {}
    );
    return res.data || {};
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.client.delete(
      `/api/admin/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(sessionId)}`
    );
  }

  async revokeAllSessions(userId: string): Promise<number> {
    const res = await this.client.delete<{ data?: { revokedCount?: number } }>(
      `/api/admin/users/${encodeURIComponent(userId)}/sessions`
    );
    return res.data?.revokedCount ?? 0;
  }

  async removeDevice(userId: string, deviceId: string): Promise<void> {
    await this.client.delete(
      `/api/admin/users/${encodeURIComponent(userId)}/devices/${encodeURIComponent(deviceId)}`
    );
  }
}

export const userRepository = new HttpUserRepository();
