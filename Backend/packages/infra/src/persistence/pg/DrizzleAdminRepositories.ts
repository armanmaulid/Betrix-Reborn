import { desc, eq, sql } from 'drizzle-orm';
import {
  IAdminActionRepository,
  IActivityLogRepository,
  IAnalyticsRepository,
  IUsageRepository,
  AdminAction,
  SystemMetrics,
  UserAnalytics,
  PaginatedResult,
  PaginationParams
} from '@betrix/domain';
import { DrizzleDb } from '../drizzle/client.js';
import { adminActions, activityLogs, users, chatMessages, sessions } from '../drizzle/schema.js';

export class DrizzleAdminActionRepository implements IAdminActionRepository {
  constructor(private readonly db: DrizzleDb) {}

  private mapToDomain(row: typeof adminActions.$inferSelect): AdminAction {
    return new AdminAction({
      id: row.id,
      adminId: row.adminId,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      details: row.details,
      ip: row.ip,
      userAgent: row.userAgent,
      createdAt: row.createdAt
    });
  }

  async save(action: AdminAction): Promise<AdminAction> {
    const inserted = await this.db
      .insert(adminActions)
      .values({
        id: action.id || undefined,
        adminId: action.adminId,
        action: action.action,
        targetType: action.targetType,
        targetId: action.targetId,
        details: action.details,
        ip: action.ip,
        userAgent: action.userAgent,
        createdAt: action.createdAt
      })
      .returning();

    return this.mapToDomain(inserted[0]!);
  }

  async findAll(pagination: PaginationParams, actionType?: string): Promise<PaginatedResult<AdminAction>> {
    const offset = (pagination.page - 1) * pagination.limit;
    const whereClause = actionType ? eq(adminActions.action, actionType) : undefined;

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(adminActions)
        .where(whereClause),
      this.db
        .select()
        .from(adminActions)
        .where(whereClause)
        .limit(pagination.limit)
        .offset(offset)
        .orderBy(desc(adminActions.createdAt))
    ]);

    const total = countResult[0]?.count || 0;
    return {
      data: rows.map((r) => this.mapToDomain(r)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit)
    };
  }

  async exportAll(): Promise<AdminAction[]> {
    const rows = await this.db.select().from(adminActions).orderBy(desc(adminActions.createdAt));
    return rows.map((r) => this.mapToDomain(r));
  }
}

export class DrizzleActivityLogRepository implements IActivityLogRepository {
  constructor(private readonly db: DrizzleDb) {}

  async log(userId: string, action: string, details?: unknown, ip?: string, userAgent?: string): Promise<void> {
    await this.db.insert(activityLogs).values({
      userId,
      action,
      details,
      ip,
      userAgent,
      createdAt: new Date()
    });
  }

  async findByUserId(userId: string, pagination: PaginationParams): Promise<PaginatedResult<unknown>> {
    const offset = (pagination.page - 1) * pagination.limit;

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(activityLogs)
        .where(eq(activityLogs.userId, userId)),
      this.db
        .select()
        .from(activityLogs)
        .where(eq(activityLogs.userId, userId))
        .limit(pagination.limit)
        .offset(offset)
        .orderBy(desc(activityLogs.createdAt))
    ]);

    const total = countResult[0]?.count || 0;
    return {
      data: rows,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit)
    };
  }
}

export class DrizzleAnalyticsRepository implements IAnalyticsRepository {
  constructor(private readonly db: DrizzleDb) {}

  async getSystemMetrics(): Promise<SystemMetrics> {
    const [userCount, sessionCount, chatStats] = await Promise.all([
      this.db.select({ count: sql<number>`cast(count(*) as integer)` }).from(users),
      this.db.select({ count: sql<number>`cast(count(*) as integer)` }).from(sessions),
      this.db
        .select({
          totalChats: sql<number>`cast(count(*) as integer)`,
          totalTokens: sql<number>`cast(coalesce(sum(${chatMessages.inputTokens} + ${chatMessages.outputTokens}), 0) as integer)`
        })
        .from(chatMessages)
    ]);

    return {
      totalUsers: userCount[0]?.count || 0,
      activeSessions: sessionCount[0]?.count || 0,
      totalChats: chatStats[0]?.totalChats || 0,
      totalTokensUsed: chatStats[0]?.totalTokens || 0,
      dbPoolActive: 1,
      dbPoolIdle: 0,
      uptimeSeconds: Math.floor(process.uptime())
    };
  }

  async getUserAnalytics(): Promise<UserAnalytics> {
    const topModels = await this.db
      .select({
        model: chatMessages.modelUsed,
        count: sql<number>`cast(count(*) as integer)`
      })
      .from(chatMessages)
      .groupBy(chatMessages.modelUsed)
      .orderBy(sql`count desc`)
      .limit(5);

    return {
      newUsersToday: 0,
      newUsersThisWeek: 0,
      activeUsers24h: 0,
      topModels,
      dailyTokenUsage: []
    };
  }
}

export class DrizzleUsageRepository implements IUsageRepository {
  constructor(private readonly db: DrizzleDb) {}

  async getSummary(userId: string): Promise<{ totalInputTokens: number; totalOutputTokens: number; totalCreditsSpent: number }> {
    const result = await this.db
      .select({
        input: sql<number>`cast(coalesce(sum(${chatMessages.inputTokens}), 0) as integer)`,
        output: sql<number>`cast(coalesce(sum(${chatMessages.outputTokens}), 0) as integer)`
      })
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId));

    const input = result[0]?.input || 0;
    const output = result[0]?.output || 0;

    return {
      totalInputTokens: input,
      totalOutputTokens: output,
      totalCreditsSpent: Math.ceil((input + output) / 1000)
    };
  }

  async getDailyUsage(userId: string, days: number = 30): Promise<{ date: string; tokens: number; credits: number }[]> {
    const rows = await this.db
      .select({
        date: sql<string>`to_char(${chatMessages.createdAt}, 'YYYY-MM-DD')`,
        tokens: sql<number>`cast(sum(${chatMessages.inputTokens} + ${chatMessages.outputTokens}) as integer)`
      })
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .groupBy(sql`to_char(${chatMessages.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${chatMessages.createdAt}, 'YYYY-MM-DD') desc`)
      .limit(days);

    return rows.map((r) => ({
      date: r.date,
      tokens: r.tokens,
      credits: Math.ceil(r.tokens / 1000)
    }));
  }
}
