import { AuditLog, type AuditLogProps } from '../../domain/entities/AuditLog';
import {
  BackgroundWorker,
  type BackgroundWorkerProps
} from '../../domain/entities/BackgroundWorker';
import { toDomainPaginated } from '@/shared/domain/types/Pagination';
import type { PaginationMeta } from '@/shared/domain/types/Pagination';

/** Raw backend audit-log DTO — the backend enriches user/action fields with admin aliases. */
export interface AuditLogDto extends Partial<AuditLogProps> {
  id: string;
  adminId?: string;
  adminEmail?: string;
  adminName?: string;
  targetType?: string;
  targetId?: string;
  ip?: string;
}

export class AuditLogMapper {
  public static toDomain(dto: AuditLogDto): AuditLog {
    return new AuditLog({
      id: dto.id,
      userId: dto.adminId ?? dto.userId,
      userEmail: dto.adminEmail ?? dto.userEmail ?? null,
      userName: dto.adminName ?? dto.userName ?? null,
      action: dto.action || 'UNKNOWN',
      resource: dto.targetType ?? dto.resource ?? 'SYSTEM',
      resourceId: dto.targetId ?? dto.resourceId,
      targetEmail: dto.targetEmail ?? null,
      targetName: dto.targetName ?? null,
      details: dto.details,
      ipAddress: dto.ip ?? dto.ipAddress,
      userAgent: dto.userAgent,
      createdAt: dto.createdAt || new Date()
    });
  }

  public static toDomainPaginated(
    paginatedDto: { data?: AuditLogDto[]; meta?: PaginationMeta } | AuditLogDto[]
  ) {
    return toDomainPaginated(paginatedDto, AuditLogMapper.toDomain);
  }

  public static toWorkerDomain(dto: BackgroundWorkerProps): BackgroundWorker {
    return new BackgroundWorker({
      id: dto.id,
      name: dto.name,
      category: dto.category || 'maintenance',
      description: dto.description || '',
      status: dto.status || 'idle',
      interval: dto.interval || '1m',
      uptimeSeconds: dto.uptimeSeconds,
      lastRunAt: dto.lastRunAt,
      nextRunAt: dto.nextRunAt,
      processedCount: dto.processedCount,
      errorCount: dto.errorCount,
      lastError: dto.lastError
    });
  }
}
