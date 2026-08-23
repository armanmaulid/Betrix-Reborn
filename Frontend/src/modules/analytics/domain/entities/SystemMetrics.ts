export interface SystemMetricsProps {
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

export interface AnalyticsQueryParams {
  period?: 'daily' | 'weekly' | 'monthly' | 'custom' | 'all';
  startDate?: string;
  endDate?: string;
}

export class SystemMetrics {
  public readonly totalUsers: number;
  public readonly activeSessions: number;
  public readonly totalChats: number;
  public readonly totalTokensUsed: number;
  public readonly dbPoolActive: number;
  public readonly dbPoolIdle: number;
  public readonly uptimeSeconds: number;
  public readonly redisStatus: string;
  public readonly redisLatencyMs: number;

  constructor(props: SystemMetricsProps) {
    this.totalUsers = Number(props.totalUsers || 0);
    this.activeSessions = Number(props.activeSessions || 0);
    this.totalChats = Number(props.totalChats || 0);
    this.totalTokensUsed = Number(props.totalTokensUsed || 0);
    this.dbPoolActive = Number(props.dbPoolActive || 0);
    this.dbPoolIdle = Number(props.dbPoolIdle || 0);
    this.uptimeSeconds = Number(props.uptimeSeconds || 0);
    this.redisStatus = props.redisStatus || 'online';
    this.redisLatencyMs = Number(props.redisLatencyMs || 0);
  }

  public get dbPoolTotal(): number {
    return this.dbPoolActive + this.dbPoolIdle;
  }

  public get dbPoolActiveRatio(): number {
    if (this.dbPoolTotal === 0) return 0;
    return Number((this.dbPoolActive / this.dbPoolTotal).toFixed(2));
  }

  public get isDbPoolStressed(): boolean {
    return this.dbPoolActiveRatio > 0.8;
  }
}
