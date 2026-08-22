import { AuditLog } from '../entities/AuditLog';
import { BackgroundWorker, type WorkerAction } from '../entities/BackgroundWorker';
import type { PaginatedResult, PaginationQueryParams } from '@shared/domain/types/Pagination';

export interface AuditLogQueryParams extends PaginationQueryParams {
  userId?: string;
  action?: string;
  resource?: string;
}

export interface BroadcastMessageInput {
  title: string;
  body: string;
  severity?: 'info' | 'warning' | 'urgent';
  targetTiers?: string[];
}

export interface SystemCleanupInput {
  table: 'chat_messages' | 'audit_logs' | 'news_articles' | 'price_ticks' | 'all';
  olderThanDays: number;
}

export interface IOperationsRepository {
  getAuditLogs(params?: AuditLogQueryParams): Promise<PaginatedResult<AuditLog>>;
  exportAuditLogs(format: 'json' | 'csv'): Promise<Blob>;
  broadcastMessage(input: BroadcastMessageInput): Promise<{ messageId: string; deliveredCount: number }>;
  getWorkers(): Promise<BackgroundWorker[]>;
  controlWorker(workerId: string, action: WorkerAction): Promise<BackgroundWorker>;
  runSystemCleanup(input: SystemCleanupInput): Promise<{ deletedRows: number }>;
}
