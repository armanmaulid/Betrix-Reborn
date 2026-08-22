import type {
  IOperationsRepository,
  AuditLogQueryParams,
  BroadcastMessageInput,
  SystemCleanupInput
} from '../../domain/repositories/IOperationsRepository';
import { AuditLog } from '../../domain/entities/AuditLog';
import { BackgroundWorker, type WorkerAction } from '../../domain/entities/BackgroundWorker';
import { AuditLogMapper } from '../mappers/AuditLogMapper';
import { HttpClient } from '@shared/infrastructure/http/api-client';
import type { PaginatedResult } from '@shared/domain/types/Pagination';

export class HttpOperationsRepository implements IOperationsRepository {
  constructor(private http: HttpClient = new HttpClient()) {}

  async getAuditLogs(params?: AuditLogQueryParams): Promise<PaginatedResult<AuditLog>> {
    const res = await this.http.get<{ data: any[]; meta: any }>('/api/admin/audit-logs', {
      queryParams: params as Record<string, any>
    });
    return AuditLogMapper.toDomainPaginated(res);
  }

  async exportAuditLogs(format: 'json' | 'csv'): Promise<Blob> {
    const res = await fetch(`/api/admin/audit-logs/export?format=${format}`);
    return res.blob();
  }

  async broadcastMessage(input: BroadcastMessageInput): Promise<{ messageId: string; deliveredCount: number }> {
    const res = await this.http.post<{ data: { messageId: string; deliveredCount: number } }>(
      '/api/admin/broadcast',
      input
    );
    return res.data;
  }

  async getWorkers(): Promise<BackgroundWorker[]> {
    const res = await this.http.get<{ data: any[] }>('/api/admin/workers');
    const items = res.data ?? (Array.isArray(res) ? res : []);
    return items.map(AuditLogMapper.toWorkerDomain);
  }

  async controlWorker(workerId: string, action: WorkerAction): Promise<BackgroundWorker> {
    const res = await this.http.post<{ data: any }>(
      `/api/admin/workers/${encodeURIComponent(workerId)}/control`,
      { action }
    );
    return AuditLogMapper.toWorkerDomain(res.data ?? res);
  }

  async runSystemCleanup(input: SystemCleanupInput): Promise<{ deletedRows: number }> {
    const res = await this.http.post<{ data: { deletedRows: number } }>(
      '/api/admin/maintenance/cleanup',
      input
    );
    return res.data ?? { deletedRows: 0 };
  }
}

export const operationsRepository = new HttpOperationsRepository();
