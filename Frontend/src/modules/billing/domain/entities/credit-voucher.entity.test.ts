import { describe, it, expect } from 'vitest';
import { CreditVoucher } from './CreditVoucher';

describe('Billing Domain: CreditVoucher invariants', () => {
  it('should evaluate expiration and validity', () => {
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

  it('should treat redeemed vouchers as invalid and normalize codes', () => {
    const redeemed = new CreditVoucher({
      id: 'v-3',
      code: '  mixed-case  ',
      amount: 10,
      isRedeemed: true,
      redeemedById: 'user-9',
      createdById: 'admin-1',
      createdAt: new Date()
    });

    expect(redeemed.isValid()).toBe(false);
    expect(redeemed.getStatus()).toBe('redeemed');
    expect(redeemed.code).toBe('MIXED-CASE');
  });
});
