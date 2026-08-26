import { PaginatedResult, PaginationParams } from '@betrix/core';
import { AdminAction } from '../entities/AdminAction.js';
import type { WorkerStatus, WorkerCategory, WorkerAction } from '../entities/BackgroundWorker.js';

export interface BackgroundWorkerInfo {
  id: string;
  name: string;
  category: WorkerCategory;
  description: string;
  status: WorkerStatus;
  interval: string;
  uptimeSeconds: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  processedCount: number;
  errorCount: number;
  lastError: string | null;
}

export interface SystemMetrics {
  totalUsers: number;
  activeSessions: number;
  totalChats: number;
  totalTokensUsed: number;
  dbPoolActive: number;
  dbPoolIdle: number;
  uptimeSeconds: number;
  redisStatus?: string;
  redisLatencyMs?: number;
}

export interface UserAnalytics {
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  activeUsers24h: number;
  activeUsersWeekly: number;
  activeUsersMonthly: number;
  topModels: { model: string; count: number }[];
  dailyTokenUsage: { date: string; tokens: number }[];
}

export interface AnalyticsQueryOptions {
  period?: 'daily' | 'weekly' | 'monthly' | 'custom' | 'all';
  startDate?: string;
  endDate?: string;
}

export interface IAdminActionRepository {
  save(action: AdminAction): Promise<AdminAction>;
  findAll(
    pagination: PaginationParams,
    actionType?: string,
    userId?: string
  ): Promise<PaginatedResult<AdminAction>>;
  exportAll(actionType?: string, userId?: string): Promise<AdminAction[]>;
}

export interface IActivityLogRepository {
  log(
    userId: string,
    action: string,
    details?: unknown,
    ip?: string,
    userAgent?: string
  ): Promise<void>;
  findByUserId(userId: string, pagination: PaginationParams): Promise<PaginatedResult<unknown>>;
}

export interface IAnalyticsRepository {
  getSystemMetrics(): Promise<SystemMetrics>;
  getUserAnalytics(options?: AnalyticsQueryOptions): Promise<UserAnalytics>;
  /** T3.1 — read gauges written by the ops aggregator; compute+write on miss. */
  getCachedSystemMetrics(): Promise<SystemMetrics>;
  /** T3.1 — aggregator output sink (Redis gauges, TTL 120s). */
  writeGauges(metrics: SystemMetrics): Promise<void>;
  /** T3.1 — default-period analytics snapshot from cache; null on miss. */
  getUserAnalyticsCached(options?: AnalyticsQueryOptions): Promise<UserAnalytics | null>;
  /** T3.1 — aggregator output sink for the default-period analytics (TTL 90s). */
  writeAnalyticsCache(analytics: UserAnalytics): Promise<void>;
}

export interface IUsageRepository {
  getSummary(
    userId: string
  ): Promise<{ totalInputTokens: number; totalOutputTokens: number; totalCreditsSpent: number }>;
  getDailyUsage(
    userId: string,
    days?: number
  ): Promise<{ date: string; tokens: number; credits: number }[]>;
}

/**
 * Persisted worker state record — the SSOT row read by `apps/worker` on boot
 * to decide whether a worker should auto-start, and written by `apps/api`
 * whenever an admin issues a control command. Redis pub/sub is only the
 * real-time transport between the two processes; this table is what
 * `WorkerManagerService` treats as the source of truth for status.
 */
export interface WorkerStateRecord {
  workerId: string;
  status: WorkerStatus;
  lastCommand: WorkerAction | null;
  lastCommandAt: Date | null;
  lastCommandBy: string | null;
  lastReportAt: Date | null;
  processedCount: number;
  errorCount: number;
  lastError: string | null;
  updatedAt: Date;
}

export interface IWorkerStateRepository {
  findAll(): Promise<WorkerStateRecord[]>;
  findByWorkerId(workerId: string): Promise<WorkerStateRecord | null>;
  /** Upserts the record after an admin issues a command (start/pause/stop/restart). */
  recordCommand(
    workerId: string,
    status: WorkerStatus,
    action: WorkerAction,
    adminId: string | null
  ): Promise<WorkerStateRecord>;
  /** Upserts the record after the worker process reports its live health/telemetry. */
  /**
   * T6.5 — telemetry-only: updates counters/lastReport but NEVER `status`
   * (status ownership belongs exclusively to recordCommand / admin actions).
   */
  recordReportTelemetry(
    workerId: string,
    processedCount: number,
    errorCount: number,
    lastError: string | null
  ): Promise<WorkerStateRecord>;
}
