import type {
  IOperationsRepository,
  AuditLogQueryParams,
  BroadcastMessageInput,
  SystemCleanupInput
} from '../../domain/repositories/IOperationsRepository';
import { AuditLog } from '../../domain/entities/AuditLog';
import { BackgroundWorker, type WorkerAction } from '../../domain/entities/BackgroundWorker';
import { AuditLogMapper } from '../mappers/AuditLogMapper';
import { HttpClient, unwrapData, unwrapListData } from '@shared/infrastructure/http/api-client';
import type { PaginatedResult } from '@shared/domain/types/Pagination';

export class HttpOperationsRepository implements IOperationsRepository {
  constructor(private http: HttpClient = new HttpClient()) {}

  async getAuditLogs(params?: AuditLogQueryParams): Promise<PaginatedResult<AuditLog>> {
    const res = await this.http.get<{ data: any[]; meta: any }>('/api/admin/audit-logs', {
      queryParams: params as Record<string, any>
    });
    return AuditLogMapper.toDomainPaginated(res);
  }

  async broadcastMessage(input: BroadcastMessageInput): Promise<{ recipientsCount: number }> {
    const res = await this.http.post<{ data: { recipientsCount: number } }>(
      '/api/admin/broadcast',
      input
    );
    return { recipientsCount: res.data?.recipientsCount ?? 0 };
  }

  async getWorkers(): Promise<BackgroundWorker[]> {
    const res = await this.http.get<{ data: any[] }>('/api/admin/workers');
    return unwrapListData(res).map(AuditLogMapper.toWorkerDomain);
  }

  async controlWorker(workerId: string, action: WorkerAction): Promise<BackgroundWorker> {
    const res = await this.http.post<{ data: any }>(
      `/api/admin/workers/${encodeURIComponent(workerId)}/control`,
      { action }
    );
    return AuditLogMapper.toWorkerDomain(unwrapData(res));
  }

  async runSystemCleanup(input: SystemCleanupInput): Promise<{
    expiredSessionsDeleted: number;
    expiredTokensDeleted: number;
    oldLoginAttemptsDeleted: number;
  }> {
    const res = await this.http.post<{
      data: {
        expiredSessionsDeleted: number;
        expiredTokensDeleted: number;
        oldLoginAttemptsDeleted: number;
      };
    }>('/api/admin/cleanup', input);
    return res.data ?? { expiredSessionsDeleted: 0, expiredTokensDeleted: 0, oldLoginAttemptsDeleted: 0 };
  }
}

export const operationsRepository = new HttpOperationsRepository();
