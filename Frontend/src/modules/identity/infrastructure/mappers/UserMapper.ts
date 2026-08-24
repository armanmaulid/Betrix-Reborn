import { User } from '../../domain/entities/User';
import type { AdminUser } from '../../domain/entities/User';
import { toDomainPaginated } from '@shared/domain/types/Pagination';

export class UserMapper {
  public static toDomain(dto: AdminUser | any): User {
    if (!dto || typeof dto !== 'object' || !dto.id) {
      throw new Error('UserMapper.toDomain: invalid DTO — missing id');
    }
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

  public static toDomainPaginated(paginatedDto: any) {
    return toDomainPaginated(paginatedDto, UserMapper.toDomain);
  }
}
