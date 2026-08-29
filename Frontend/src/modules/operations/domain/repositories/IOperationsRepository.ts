import { AuditLog } from '../entities/AuditLog';
import { BackgroundWorker, type WorkerAction } from '../entities/BackgroundWorker';
import type { PaginatedResult, PaginationQueryParams } from '@/shared/domain/types/Pagination';

export interface AuditLogQueryParams extends PaginationQueryParams {
  userId?: string;
  action?: string;
  actionType?: string;
}

export interface BroadcastMessageInput {
  subject: string;
  body: string;
  targetUserIds?: string[];
}

export interface SystemCleanupInput {
  olderThanDays?: number;
}

export interface IOperationsRepository {
  getAuditLogs(params?: AuditLogQueryParams): Promise<PaginatedResult<AuditLog>>;
  broadcastMessage(input: BroadcastMessageInput): Promise<{ recipientsCount: number }>;
  getWorkers(): Promise<BackgroundWorker[]>;
  controlWorker(workerId: string, action: WorkerAction): Promise<BackgroundWorker>;
  runSystemCleanup(input: SystemCleanupInput): Promise<{
    expiredSessionsDeleted: number;
    expiredTokensDeleted: number;
    oldLoginAttemptsDeleted: number;
  }>;
}
