import type {
  IVoucherRepository,
  CreateVoucherInput
} from '../../domain/repositories/IVoucherRepository';
import {
  CreditVoucher,
  type CreditVoucherProps
} from '@/modules/billing/domain/entities/CreditVoucher';
import { VoucherMapper } from '../mappers/VoucherMapper';
import { HttpClient, unwrapData } from '@/shared/infrastructure/http/api-client';
import type { PaginatedResult, PaginationQueryParams } from '@/shared/domain/types/Pagination';

export class HttpVoucherRepository implements IVoucherRepository {
  constructor(private client: HttpClient = new HttpClient()) {}

  async getVouchers(params?: PaginationQueryParams): Promise<PaginatedResult<CreditVoucher>> {
    const res = await this.client.get<{ data: CreditVoucherProps[] }>('/api/admin/vouchers', {
      queryParams: params as Record<string, string | number | boolean | undefined | null>
    });
    return VoucherMapper.toDomainPaginated(res);
  }

  async createVoucher(input: CreateVoucherInput): Promise<CreditVoucher | CreditVoucher[]> {
    const res = await this.client.post<{ data: CreditVoucherProps | CreditVoucherProps[] }>(
      '/api/admin/vouchers',
      input
    );
    const body = unwrapData<CreditVoucherProps | CreditVoucherProps[]>(res);
    if (Array.isArray(body)) {
      return body.map(VoucherMapper.toDomain);
    }
    return VoucherMapper.toDomain(body);
  }

  async revokeVoucher(id: string): Promise<void> {
    await this.client.delete(`/api/admin/vouchers/${encodeURIComponent(id)}`);
  }

  async batchRevokeVouchers(ids: string[]): Promise<{ revokedCount: number }> {
    const res = await this.client.post<{ data: { revokedCount: number } }>(
      '/api/admin/vouchers/batch-revoke',
      { ids }
    );
    return res.data || { revokedCount: ids.length };
  }
}

export const voucherRepository = new HttpVoucherRepository();
