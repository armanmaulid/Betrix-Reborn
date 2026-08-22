import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserMapper } from './mappers/UserMapper';
import { HttpUserRepository } from './repositories/HttpUserRepository';
import { HttpClient } from '@shared/infrastructure/http/api-client';

describe('Identity Infrastructure: UserMapper & HttpUserRepository', () => {
  let mockHttpClient: HttpClient;
  let userRepo: HttpUserRepository;

  beforeEach(() => {
    mockHttpClient = new HttpClient();
    userRepo = new HttpUserRepository(mockHttpClient);
  });

  it('should correctly map raw backend DTO to User Domain Entity', () => {
    const rawDto = {
      id: 'usr-123',
      email: 'investor@betrix.io',
      name: 'Institutional Investor',
      status: 'active',
      tier: 'vip',
      isAdmin: true,
      credits: 50000,
      emailVerified: true,
      createdAt: '2026-01-15T08:30:00Z'
    };

    const domainUser = UserMapper.toDomain(rawDto);

    expect(domainUser.id).toBe('usr-123');
    expect(domainUser.tier).toBe('vip');
    expect(domainUser.isAdmin).toBe(true);
    expect(domainUser.isActive()).toBe(true);
    expect(domainUser.hasSufficientCredits(25000)).toBe(true);
  });

  it('should fetch and map paginated users list via HttpUserRepository', async () => {
    const mockApiResponse = {
      data: [
        { id: 'usr-1', email: 'u1@betrix.io', status: 'active', credits: 100, isAdmin: false, emailVerified: true, createdAt: '2026-01-01T00:00:00Z' }
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 }
    };

    vi.spyOn(mockHttpClient, 'get').mockResolvedValue(mockApiResponse);

    const result = await userRepo.getUsers({ page: 1, limit: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].email).toBe('u1@betrix.io');
    expect(result.meta.total).toBe(1);
  });
});
