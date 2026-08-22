/**
 * Betrix Frontend Type Definitions & Re-exports
 * Unified Single Source of Truth bridged with Domain-Driven Design (DDD) modules.
 */

// Shared Primitives
export * from '@/shared/domain/types/Result';
export * from '@/shared/domain/errors/AppError';
export * from '@/shared/domain/types/Pagination';

// Identity Domain Types
export type { UserTierLevel as UserTier } from '@/modules/identity/domain/value-objects/UserTier';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'suspended' | 'banned';
  tier?: import('@/modules/identity/domain/value-objects/UserTier').UserTierLevel;
  isAdmin: boolean;
  credits: number;
  emailVerified: boolean;
  phone?: string | null;
  address?: string | null;
  birthdate?: string | null;
  gender?: string | null;
  bio?: string | null;
  lastActive?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export type UserProps = AdminUser;

export interface UserDevice {
  id: string;
  userId: string;
  fingerprint: string;
  trusted: boolean;
  lastSeenAt: string;
  createdAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  deviceFingerprint: string;
  ip: string;
  userAgent: string;
  expiresAt: string;
  createdAt: string;
}

export interface UserUsageSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCreditsSpent: number;
}

export interface AdminUserDetail {
  user: AdminUser;
  devices: UserDevice[];
  sessions: UserSession[];
  usageSummary?: UserUsageSummary;
}

export interface AdminChatMessage {
  id: string;
  userId: string;
  sessionId: string;
  taskType: string;
  modelUsed: string;
  message: string;
  reply: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
  createdAt: string;
}

export interface AdminChatHistoryQuery {
  page?: number;
  limit?: number;
  sessionId?: string;
}

export interface AdminUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'suspended' | 'banned';
  tier?: import('@/modules/identity/domain/value-objects/UserTier').UserTierLevel;
  isAdmin?: boolean;
}

// Intelligence Domain Types
export interface AiAgent {
  id: string;
  name: string;
  modelName: string;
  baseUrl?: string | null;
  apiKey?: string | null;
  taskType: string;
  systemPrompt?: string | null;
  tier: 'cheap' | 'balanced' | 'deep';
  creditsPer1kTokens: number;
  maxTokens: number;
  temperature: number;
  supportsThinking: boolean;
  isDefault: boolean;
  isActive: boolean;
  visibility: 'public' | 'private';
  description?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
  calculateEstimatedCredits?: (tokens: number) => number;
  getTierBadgeVariant?: () => 'positive' | 'info' | 'accent';
}

export type AgentDetail = AiAgent;

export interface CreditVoucher {
  id: string;
  code: string;
  amount: number;
  isRedeemed: boolean;
  redeemedById?: string | null;
  redeemedAt?: string | null;
  expiresAt?: string | null | Date;
  createdById: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  isValid?: () => boolean;
  isExpired?: () => boolean;
  getStatus?: () => 'redeemed' | 'expired' | 'available';
  getStatusBadgeClass?: () => string;
}

export type {
  AgentTestPayload,
  AgentTestResult,
  CreateAgentInput,
  UpdateAgentInput
} from '@/modules/intelligence/domain/repositories/IAgentRepository';

// Market Domain Types
export type {
  MarketInstrument as MarketSymbol,
  MarketInstrumentProps,
  StreamSymbolEntity as StreamSymbol,
  StreamSymbolEntityProps
} from '@/modules/market/domain/entities/MarketInstrument';
export type { PriceTick as MarketPrice, PriceTickProps } from '@/modules/market/domain/value-objects/PriceTick';

// Operations Domain Types
export type { AuditLog, AuditLogProps } from '@/modules/operations/domain/entities/AuditLog';

export interface BackgroundWorkerInfo {
  id: string;
  name: string;
  category: 'market' | 'news' | 'maintenance' | 'intelligence';
  description: string;
  status: 'running' | 'paused' | 'stopped' | 'idle' | 'error';
  interval: string;
  uptimeSeconds: number;
  lastRunAt: string | Date | null;
  nextRunAt: string | Date | null;
  processedCount: number;
  errorCount: number;
  lastError: string | null;
  isRunning?: () => boolean;
  isPaused?: () => boolean;
  hasErrors?: () => boolean;
  getStatusBadgeClass?: () => string;
}

export type {
  WorkerStatus,
  WorkerAction,
  WorkerCategory
} from '@/modules/operations/domain/entities/BackgroundWorker';

// Analytics Domain Types
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
  dbPoolTotal?: number;
  dbPoolActiveRatio?: number;
  isDbPoolStressed?: boolean;
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

export interface AnalyticsQueryParams {
  period?: 'daily' | 'weekly' | 'monthly' | 'custom' | 'all';
  startDate?: string;
  endDate?: string;
}

// News Domain Types
export type { NewsArticle, NewsArticleProps } from '@/modules/news/domain/entities/NewsArticle';
export type { NewsQueryParams } from '@/modules/news/domain/repositories/INewsRepository';

// General API Wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: {
    message: string;
    code?: string;
    details?: unknown;
    captchaId?: string;
    captchaSvg?: string;
    delayMs?: number;
  };
}
