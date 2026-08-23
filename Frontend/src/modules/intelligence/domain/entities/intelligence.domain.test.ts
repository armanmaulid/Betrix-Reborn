import { describe, it, expect } from 'vitest';
import { AiAgent } from './AiAgent';
import { CreditVoucher } from './CreditVoucher';

describe('Intelligence Domain: AiAgent & CreditVoucher', () => {
  it('should instantiate AiAgent and calculate estimated credits accurately', () => {
    const agent = new AiAgent({
      id: 'gpt-4o',
      name: 'GPT-4o Institutional',
      modelName: 'gpt-4o',
      taskType: 'analysis',
      tier: 'deep',
      creditsPer1kTokens: 15,
      maxTokens: 8192,
      temperature: 0.7,
      supportsThinking: true,
      isDefault: true,
      isActive: true,
      visibility: 'public',
      createdAt: '2026-01-01T00:00:00Z'
    });

    expect(agent.isDefault).toBe(true);
    expect(agent.calculateEstimatedCredits(10000)).toBe(150);
    expect(agent.getTierBadgeVariant()).toBe('accent');
  });

  it('should evaluate CreditVoucher expiration and validity invariants', () => {
    const pastDate = new Date(Date.now() - 3600000);
    const futureDate = new Date(Date.now() + 3600000);

    const validVoucher = new CreditVoucher({
      id: 'v-1',
      code: 'BETRIX100',
      amount: 100,
      isRedeemed: false,
      createdById: 'admin-1',
      expiresAt: futureDate,
      createdAt: new Date()
    });

    expect(validVoucher.isValid()).toBe(true);
    expect(validVoucher.getStatus()).toBe('available');

    const expiredVoucher = new CreditVoucher({
      id: 'v-2',
      code: 'OLDVOUCHER',
      amount: 50,
      isRedeemed: false,
      createdById: 'admin-1',
      expiresAt: pastDate,
      createdAt: new Date()
    });

    expect(expiredVoucher.isExpired()).toBe(true);
    expect(expiredVoucher.isValid()).toBe(false);
    expect(expiredVoucher.getStatus()).toBe('expired');
  });


});
