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
        {
          id: 'usr-1',
          email: 'u1@betrix.io',
          status: 'active',
          credits: 100,
          isAdmin: false,
          emailVerified: true,
          createdAt: '2026-01-01T00:00:00Z'
        }
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 }
    };

    vi.spyOn(mockHttpClient, 'get').mockResolvedValue(mockApiResponse);

    const result = await userRepo.getUsers({ page: 1, limit: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].email).toBe('u1@betrix.io');
    expect(result.meta.total).toBe(1);
  });

  it('should unwrap { data: { user, generatedPassword } } envelope on createUser', async () => {
    const backendEnvelope = {
      success: true,
      data: {
        user: {
          id: 'usr-new',
          email: 'new@betrix.io',
          name: 'New User',
          status: 'active',
          tier: 'free',
          isAdmin: false,
          credits: 100,
          createdAt: '2026-08-24T00:00:00Z'
        },
        generatedPassword: 'a1b2c3d4e5f6'
      }
    };

    const postSpy = vi.spyOn(mockHttpClient, 'post').mockResolvedValue(backendEnvelope);

    const result = await userRepo.createUser({ email: 'new@betrix.io', credits: 100 });

    expect(postSpy).toHaveBeenCalledWith('/api/admin/users', {
      email: 'new@betrix.io',
      credits: 100
    });
    expect(result.user.id).toBe('usr-new');
    expect(result.user.email).toBe('new@betrix.io');
    expect(result.generatedPassword).toBe('a1b2c3d4e5f6');
  });

  it('should surface generatedPassword as undefined when admin supplied an explicit password', async () => {
    vi.spyOn(mockHttpClient, 'post').mockResolvedValue({
      success: true,
      data: {
        user: { id: 'usr-pw', email: 'pw@betrix.io', createdAt: '2026-08-24T00:00:00Z' }
      }
    });

    const result = await userRepo.createUser({ email: 'pw@betrix.io', password: 'Sup3rSecret!' });

    expect(result.generatedPassword).toBeUndefined();
    expect(result.user.id).toBe('usr-pw');
  });

  it('should throw when UserMapper receives a DTO without id', () => {
    expect(() => UserMapper.toDomain({ email: 'broken@betrix.io' })).toThrowError(/missing id/);
    expect(() => UserMapper.toDomain(null)).toThrowError(/missing id/);
  });
});
