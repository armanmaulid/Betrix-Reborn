import { AuditLog } from '../../domain/entities/AuditLog';
import { BackgroundWorker } from '../../domain/entities/BackgroundWorker';
import type { PaginatedResult } from '@shared/domain/types/Pagination';

export class AuditLogMapper {
  public static toDomain(dto: any): AuditLog {
    return new AuditLog({
      id: dto.id,
      userId: dto.userId,
      action: dto.action || 'UNKNOWN',
      resource: dto.resource || 'SYSTEM',
      resourceId: dto.resourceId,
      details: dto.details,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      createdAt: dto.createdAt || new Date()
    });
  }

  public static toDomainPaginated(paginatedDto: any): PaginatedResult<AuditLog> {
    const rawItems = Array.isArray(paginatedDto?.data) ? paginatedDto.data : [];
    const meta = paginatedDto?.meta || {
      page: 1,
      limit: rawItems.length,
      total: rawItems.length,
      totalPages: 1
    };

    return {
      data: rawItems.map(AuditLogMapper.toDomain),
      meta
    };
  }

  public static toWorkerDomain(dto: any): BackgroundWorker {
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
