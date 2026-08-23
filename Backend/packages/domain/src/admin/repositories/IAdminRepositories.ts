import { PaginatedResult, PaginationParams } from '@betrix/core';
import { AdminAction } from '../entities/AdminAction.js';
import type { WorkerStatus } from '../entities/BackgroundWorker.js';

export interface BackgroundWorkerInfo {
  id: string;
  name: string;
  category: 'market' | 'news' | 'maintenance' | 'intelligence';
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
  findAll(pagination: PaginationParams, actionType?: string, userId?: string): Promise<PaginatedResult<AdminAction>>;
  exportAll(actionType?: string, userId?: string): Promise<AdminAction[]>;
}

export interface IActivityLogRepository {
  log(userId: string, action: string, details?: unknown, ip?: string, userAgent?: string): Promise<void>;
  findByUserId(userId: string, pagination: PaginationParams): Promise<PaginatedResult<unknown>>;
}

export interface IAnalyticsRepository {
  getSystemMetrics(): Promise<SystemMetrics>;
  getUserAnalytics(options?: AnalyticsQueryOptions): Promise<UserAnalytics>;
}

export interface IUsageRepository {
  getSummary(userId: string): Promise<{ totalInputTokens: number; totalOutputTokens: number; totalCreditsSpent: number }>;
  getDailyUsage(userId: string, days?: number): Promise<{ date: string; tokens: number; credits: number }[]>;
}
