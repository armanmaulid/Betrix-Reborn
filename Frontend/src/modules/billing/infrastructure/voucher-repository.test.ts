import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoucherMapper } from './mappers/VoucherMapper';
import { HttpVoucherRepository } from './repositories/HttpVoucherRepository';
import { HttpClient } from '@/shared/infrastructure/http/api-client';

describe('Billing Infrastructure: VoucherMapper & HttpVoucherRepository', () => {
  let mockHttpClient: HttpClient;
  let voucherRepo: HttpVoucherRepository;

  beforeEach(() => {
    mockHttpClient = new HttpClient();
    voucherRepo = new HttpVoucherRepository(mockHttpClient);
  });

  it('should correctly map raw backend DTO to CreditVoucher Domain Entity', () => {
    const rawDto = {
      id: 'v-999',
      code: 'BETRIXVIP',
      amount: 500,
      isRedeemed: false,
      createdById: 'admin-0',
      createdAt: '2026-02-01T00:00:00Z',
      expiresAt: '2026-12-31T23:59:59Z'
    };

    const domainVoucher = VoucherMapper.toDomain(rawDto);

    expect(domainVoucher.id).toBe('v-999');
    expect(domainVoucher.code).toBe('BETRIXVIP');
    expect(domainVoucher.amount).toBe(500);
    expect(domainVoucher.isValid()).toBe(true);
  });

  it('should batch revoke vouchers via HttpVoucherRepository', async () => {
    vi.spyOn(mockHttpClient, 'post').mockResolvedValue({
      data: { revokedCount: 3 }
    });

    const res = await voucherRepo.batchRevokeVouchers(['v1', 'v2', 'v3']);
    expect(res.revokedCount).toBe(3);
  });
});
