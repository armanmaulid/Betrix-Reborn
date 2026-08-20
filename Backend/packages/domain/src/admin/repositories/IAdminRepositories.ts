import { PaginatedResult, PaginationParams } from '@betrix/core';
import { AdminAction } from '../entities/AdminAction.js';

export interface SystemMetrics {
  totalUsers: number;
  activeSessions: number;
  totalChats: number;
  totalTokensUsed: number;
  dbPoolActive: number;
  dbPoolIdle: number;
  uptimeSeconds: number;
}

export interface UserAnalytics {
  newUsersToday: number;
  newUsersThisWeek: number;
  activeUsers24h: number;
  topModels: { model: string; count: number }[];
  dailyTokenUsage: { date: string; tokens: number }[];
}

export interface IAdminActionRepository {
  save(action: AdminAction): Promise<AdminAction>;
  findAll(pagination: PaginationParams, actionType?: string): Promise<PaginatedResult<AdminAction>>;
  exportAll(): Promise<AdminAction[]>;
}

export interface IActivityLogRepository {
  log(userId: string, action: string, details?: unknown, ip?: string, userAgent?: string): Promise<void>;
  findByUserId(userId: string, pagination: PaginationParams): Promise<PaginatedResult<unknown>>;
}

export interface IAnalyticsRepository {
  getSystemMetrics(): Promise<SystemMetrics>;
  getUserAnalytics(): Promise<UserAnalytics>;
}

export interface IUsageRepository {
  getSummary(userId: string): Promise<{ totalInputTokens: number; totalOutputTokens: number; totalCreditsSpent: number }>;
  getDailyUsage(userId: string, days?: number): Promise<{ date: string; tokens: number; credits: number }[]>;
}
