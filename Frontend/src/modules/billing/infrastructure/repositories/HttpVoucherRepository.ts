import type {
  IVoucherRepository,
  CreateVoucherInput
} from '../../domain/repositories/IVoucherRepository';
import { CreditVoucher } from '@billing/domain/entities/CreditVoucher';
import { VoucherMapper } from '../mappers/VoucherMapper';
import { HttpClient } from '@shared/infrastructure/http/api-client';
import type { PaginatedResult, PaginationQueryParams } from '@shared/domain/types/Pagination';

export class HttpVoucherRepository implements IVoucherRepository {
  constructor(private client: HttpClient = new HttpClient()) {}

  async getVouchers(params?: PaginationQueryParams): Promise<PaginatedResult<CreditVoucher>> {
    const res = await this.client.get<{ data: any[]; meta: any }>('/api/admin/vouchers', {
      queryParams: params as Record<string, any>
    });
    return VoucherMapper.toDomainPaginated(res);
  }

  async createVoucher(input: CreateVoucherInput): Promise<CreditVoucher | CreditVoucher[]> {
    const res = await this.client.post<{ data: any }>('/api/admin/vouchers', input);
    if (Array.isArray(res.data)) {
      return res.data.map(VoucherMapper.toDomain);
    }
    return VoucherMapper.toDomain(res.data || res);
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
