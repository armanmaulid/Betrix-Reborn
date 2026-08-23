import { AuditLog } from '../../domain/entities/AuditLog';
import { BackgroundWorker } from '../../domain/entities/BackgroundWorker';
import { toDomainPaginated } from '@shared/domain/types/Pagination';

export class AuditLogMapper {
  public static toDomain(dto: any): AuditLog {
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

  public static toDomainPaginated(paginatedDto: any) {
    return toDomainPaginated(paginatedDto, AuditLogMapper.toDomain);
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
