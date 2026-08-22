import { SystemMetrics } from '../../domain/entities/SystemMetrics';

export class AnalyticsMapper {
  public static toSystemMetrics(dto: any): SystemMetrics {
    return new SystemMetrics({
      totalUsers: dto.totalUsers,
      activeSessions: dto.activeSessions,
      totalChats: dto.totalChats,
      totalTokensUsed: dto.totalTokensUsed,
      dbPoolActive: dto.dbPoolActive,
      dbPoolIdle: dto.dbPoolIdle,
      uptimeSeconds: dto.uptimeSeconds,
      redisStatus: dto.redisStatus,
      redisLatencyMs: dto.redisLatencyMs
    });
  }
}
