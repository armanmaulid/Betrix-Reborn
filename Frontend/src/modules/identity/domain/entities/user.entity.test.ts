import { describe, it, expect } from 'vitest';
import { User } from './User';
import { UserTier } from '../value-objects/UserTier';

describe('User Domain Entity & UserTier Value Object', () => {
  it('should instantiate a user entity with normalized tier', () => {
    const user = new User({
      id: 'usr-1',
      email: 'trader@betrix.io',
      name: 'Alpha Trader',
      status: 'active',
      tier: 'pro',
      isAdmin: false,
      credits: 1500,
      emailVerified: true,
      createdAt: '2026-01-01T00:00:00Z'
    });

    expect(user.id).toBe('usr-1');
    expect(user.tier).toBe('pro');
    expect(user.isActive()).toBe(true);
    expect(user.isBanned()).toBe(false);
    expect(user.hasSufficientCredits(1000)).toBe(true);
    expect(user.hasSufficientCredits(2000)).toBe(false);
    expect(user.getDisplayName()).toBe('Alpha Trader');
  });

  it('should normalize invalid or empty tier to free', () => {
    expect(UserTier.normalize('invalid-tier')).toBe('free');
    expect(UserTier.normalize(null)).toBe('free');
    expect(UserTier.normalize('VIP')).toBe('vip');
  });

  it('should return correct display name when name is empty', () => {
    const user = new User({
      id: 'usr-2',
      email: 'quant@betrix.io',
      name: null,
      status: 'banned',
      isAdmin: false,
      credits: 0,
      emailVerified: false,
      createdAt: new Date()
    });

    expect(user.getDisplayName()).toBe('quant');
    expect(user.isBanned()).toBe(true);
  });
});
