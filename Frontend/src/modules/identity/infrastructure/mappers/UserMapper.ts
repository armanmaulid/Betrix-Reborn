import { User } from '../../domain/entities/User';
import type {
  AdminUser,
  AdminChatMessage,
  AdminChatHistoryQuery
} from '../../domain/entities/User';
import { toDomainPaginated } from '@/shared/domain/types/Pagination';
import type { PaginatedResult, PaginationMeta } from '@/shared/domain/types/Pagination';

export class UserMapper {
  public static toDomain(dto: unknown): User {
    if (!dto || typeof dto !== 'object' || !('id' in dto) || !dto.id) {
      throw new Error('UserMapper.toDomain: invalid DTO — missing id');
    }
    const d = dto as AdminUser;
    return new User({
      id: d.id,
      email: d.email,
      name: d.name,
      status: d.status || 'active',
      tier: d.tier,
      isAdmin: Boolean(d.isAdmin),
      credits: Number(d.credits || 0),
      emailVerified: Boolean(d.emailVerified),
      phone: d.phone,
      address: d.address,
      birthdate: d.birthdate,
      gender: d.gender,
      bio: d.bio,
      lastActive: d.lastActive,
      createdAt: d.createdAt || new Date().toISOString(),
      updatedAt: d.updatedAt
    });
  }

  public static toDomainPaginated(
    paginatedDto: { data?: unknown[]; meta?: PaginationMeta } | unknown[]
  ) {
    return toDomainPaginated(paginatedDto, UserMapper.toDomain);
  }

  public static toChatHistoryPaginated(
    res: {
      data?: AdminChatMessage[] | AdminChatMessage;
      meta?: PaginatedResult<AdminChatMessage>['meta'];
    },
    params?: AdminChatHistoryQuery
  ): PaginatedResult<AdminChatMessage> {
    const raw = res?.data;
    if (Array.isArray(raw)) {
      return {
        data: raw,
        meta: res.meta || {
          page: params?.page || 1,
          limit: params?.limit || 20,
          total: raw.length,
          totalPages: Math.max(1, Math.ceil(raw.length / (params?.limit || 20)))
        }
      };
    }
    return {
      data: raw ? [raw] : [],
      meta: res.meta || { page: 1, limit: 20, total: 0, totalPages: 1 }
    };
  }
}
