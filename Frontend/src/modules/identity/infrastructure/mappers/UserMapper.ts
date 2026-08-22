import { User } from '../../domain/entities/User';
import type { AdminUser, PaginatedResult } from '@/lib/types';
import type { PaginatedResult as DomainPaginatedResult } from '@shared/domain/types/Pagination';

export class UserMapper {
  public static toDomain(dto: AdminUser | any): User {
    return new User({
      id: dto.id,
      email: dto.email,
      name: dto.name,
      status: dto.status || 'active',
      tier: dto.tier,
      isAdmin: Boolean(dto.isAdmin),
      credits: Number(dto.credits || 0),
      emailVerified: Boolean(dto.emailVerified),
      phone: dto.phone,
      address: dto.address,
      birthdate: dto.birthdate,
      gender: dto.gender,
      bio: dto.bio,
      lastActive: dto.lastActive,
      createdAt: dto.createdAt || new Date().toISOString(),
      updatedAt: dto.updatedAt
    });
  }

  public static toDomainPaginated(paginatedDto: PaginatedResult<AdminUser> | any): DomainPaginatedResult<User> {
    const rawItems = Array.isArray(paginatedDto?.data) ? paginatedDto.data : [];
    const meta = paginatedDto?.meta || {
      page: 1,
      limit: rawItems.length,
      total: rawItems.length,
      totalPages: 1
    };

    return {
      data: rawItems.map(UserMapper.toDomain),
      meta
    };
  }
}
