export type UserTier = 'free' | 'starter' | 'pro' | 'premium' | 'vip';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'suspended' | 'banned';
  tier?: UserTier;
  isAdmin: boolean;
  credits: number;
  emailVerified: boolean;
  phone?: string | null;
  address?: string | null;
  birthdate?: string | null;
  gender?: string | null;
  bio?: string | null;
  lastActive?: string | null;
  createdAt: string;
  updatedAt: string;
}

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


export interface CreditVoucher {
  id: string;
  code: string;
  amount: number;
  isRedeemed: boolean;
  redeemedById?: string | null;
  redeemedAt?: string | null;
  expiresAt?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiAgent {
  id: string;
  name: string;
  modelName: string;
  baseUrl?: string | null;
  apiKey?: string | null; // Masked as '***' from backend
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
  createdAt: string;
  updatedAt: string;
}

export interface AgentTestResult {
  agentId: string;
  agentName: string;
  modelUsed: string;
  reply: string;
  thinking?: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    latencyMs: number;
  };
}

export interface AgentTestPayload {
  message: string;
  systemPromptOverride?: string | null;
  temperatureOverride?: number;
  maxTokensOverride?: number;
}

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

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface AdminUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'suspended' | 'banned';
  tier?: UserTier;
  isAdmin?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

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

export interface NewsArticle {
  id: string;
  source: string;
  headline: string;
  url: string;
  summary: string;
  datetime: number;
  category: string;
  tags: string[];
  image?: string | null;
  createdAt: string;
}

export interface NewsQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  search?: string;
}

export interface MarketPrice {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  change24h?: number;
  change24hPercent?: number;
  volume24h?: number;
  high24h?: number;
  low24h?: number;
  timestamp: number;
}

export interface MarketSymbol {
  symbol: string;
  name?: string;
  description?: string;
  category: string;
  digits?: number;
  pipSize?: number;
  finnhubSymbol?: string;
  dukascopySymbol?: string;
  isActive: boolean;
}

export interface StreamSymbol {
  symbol: string;
  finnhubSymbol: string;
  description?: string | null;
  category: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type WorkerStatus = 'running' | 'paused' | 'stopped' | 'idle' | 'error';
export type WorkerAction = 'start' | 'pause' | 'stop' | 'restart';

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

