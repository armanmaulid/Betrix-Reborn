import { desc, eq, sql, and, or } from 'drizzle-orm';
import {
  IAdminActionRepository,
  IActivityLogRepository,
  IAnalyticsRepository,
  IUsageRepository,
  IWorkerStateRepository,
  WorkerStateRecord,
  WorkerStatus,
  WorkerAction,
  AdminAction,
  SystemMetrics,
  UserAnalytics,
  AnalyticsQueryOptions,
  PaginatedResult,
  PaginationParams
} from '@betrix/domain';
import { DrizzleDb } from '../drizzle/client.js';
import {
  adminActions,
  activityLogs,
  users,
  chatMessages,
  sessions,
  workerStates
} from '../drizzle/schema.js';

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

  async findAll(
    pagination: PaginationParams,
    actionType?: string,
    userId?: string
  ): Promise<PaginatedResult<AdminAction>> {
    const offset = (pagination.page - 1) * pagination.limit;
    const conditions = [];
    if (actionType) conditions.push(eq(adminActions.action, actionType));
    if (userId)
      conditions.push(or(eq(adminActions.adminId, userId), eq(adminActions.targetId, userId)));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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

  async exportAll(actionType?: string, userId?: string): Promise<AdminAction[]> {
    const conditions = [];
    if (actionType) conditions.push(eq(adminActions.action, actionType));
    if (userId)
      conditions.push(or(eq(adminActions.adminId, userId), eq(adminActions.targetId, userId)));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const query = whereClause
      ? this.db.select().from(adminActions).where(whereClause).orderBy(desc(adminActions.createdAt))
      : this.db.select().from(adminActions).orderBy(desc(adminActions.createdAt));
    const rows = await query;
    return rows.map((r) => this.mapToDomain(r));
  }
}

export class DrizzleActivityLogRepository implements IActivityLogRepository {
  constructor(private readonly db: DrizzleDb) {}

  async log(
    userId: string,
    action: string,
    details?: unknown,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    await this.db.insert(activityLogs).values({
      userId,
      action,
      details,
      ip,
      userAgent,
      createdAt: new Date()
    });
  }

  async findByUserId(
    userId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResult<unknown>> {
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
  constructor(
    private readonly db: DrizzleDb,
    private readonly redis?: any
  ) {}

  async getSystemMetrics(): Promise<SystemMetrics> {
    let redisStatus = 'healthy';
    let redisLatencyMs = 0;

    if (this.redis) {
      try {
        const start = Date.now();
        await this.redis.ping();
        redisLatencyMs = Date.now() - start;
      } catch (err: any) {
        redisStatus = `unhealthy: ${err?.message || 'timeout'}`;
      }
    }

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
      uptimeSeconds: Math.floor(process.uptime()),
      redisStatus,
      redisLatencyMs
    };
  }

  async getUserAnalytics(options?: AnalyticsQueryOptions): Promise<UserAnalytics> {
    const period = options?.period || 'daily';

    const [
      newTodayRes,
      newWeekRes,
      newMonthRes,
      active24hRes,
      activeWeekRes,
      activeMonthRes,
      topModels
    ] = await Promise.all([
      // New users today (UTC)
      this.db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(users)
        .where(sql`${users.createdAt} >= date_trunc('day', now() at time zone 'utc')`),

      // New users rolling 7 days
      this.db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(users)
        .where(sql`${users.createdAt} >= (now() - interval '7 days')`),

      // New users rolling 30 days
      this.db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(users)
        .where(sql`${users.createdAt} >= (now() - interval '30 days')`),

      // Active users 24h
      this.db
        .select({ count: sql<number>`cast(count(distinct ${users.id}) as integer)` })
        .from(users)
        .where(
          sql`${users.lastActive} >= (now() - interval '24 hours') or ${users.id} in (select ${sessions.userId} from ${sessions} where ${sessions.createdAt} >= now() - interval '24 hours') or ${users.id} in (select ${chatMessages.userId} from ${chatMessages} where ${chatMessages.createdAt} >= now() - interval '24 hours')`
        ),

      // Active users 7 days
      this.db
        .select({ count: sql<number>`cast(count(distinct ${users.id}) as integer)` })
        .from(users)
        .where(
          sql`${users.lastActive} >= (now() - interval '7 days') or ${users.id} in (select ${sessions.userId} from ${sessions} where ${sessions.createdAt} >= now() - interval '7 days') or ${users.id} in (select ${chatMessages.userId} from ${chatMessages} where ${chatMessages.createdAt} >= now() - interval '7 days')`
        ),

      // Active users 30 days
      this.db
        .select({ count: sql<number>`cast(count(distinct ${users.id}) as integer)` })
        .from(users)
        .where(
          sql`${users.lastActive} >= (now() - interval '30 days') or ${users.id} in (select ${sessions.userId} from ${sessions} where ${sessions.createdAt} >= now() - interval '30 days') or ${users.id} in (select ${chatMessages.userId} from ${chatMessages} where ${chatMessages.createdAt} >= now() - interval '30 days')`
        ),

      // Top AI Models
      this.db
        .select({
          model: chatMessages.modelUsed,
          count: sql<number>`cast(count(*) as integer)`
        })
        .from(chatMessages)
        .groupBy(chatMessages.modelUsed)
        .orderBy(sql`count desc`)
        .limit(5)
    ]);

    // Token Usage Time-Series based on period
    let tokenUsageRows: { date: string; tokens: number }[] = [];

    if (period === 'weekly') {
      tokenUsageRows = await this.db
        .select({
          date: sql<string>`to_char(date_trunc('week', ${chatMessages.createdAt}), 'YYYY-MM-DD')`,
          tokens: sql<number>`cast(coalesce(sum(${chatMessages.inputTokens} + ${chatMessages.outputTokens}), 0) as integer)`
        })
        .from(chatMessages)
        .where(sql`${chatMessages.createdAt} >= now() - interval '12 weeks'`)
        .groupBy(sql`date_trunc('week', ${chatMessages.createdAt})`)
        .orderBy(sql`date_trunc('week', ${chatMessages.createdAt}) asc`);
    } else if (period === 'monthly') {
      tokenUsageRows = await this.db
        .select({
          date: sql<string>`to_char(date_trunc('month', ${chatMessages.createdAt}), 'YYYY-MM')`,
          tokens: sql<number>`cast(coalesce(sum(${chatMessages.inputTokens} + ${chatMessages.outputTokens}), 0) as integer)`
        })
        .from(chatMessages)
        .where(sql`${chatMessages.createdAt} >= now() - interval '12 months'`)
        .groupBy(sql`date_trunc('month', ${chatMessages.createdAt})`)
        .orderBy(sql`date_trunc('month', ${chatMessages.createdAt}) asc`);
    } else if (period === 'all') {
      tokenUsageRows = await this.db
        .select({
          date: sql<string>`to_char(${chatMessages.createdAt}, 'YYYY-MM')`,
          tokens: sql<number>`cast(coalesce(sum(${chatMessages.inputTokens} + ${chatMessages.outputTokens}), 0) as integer)`
        })
        .from(chatMessages)
        .groupBy(sql`to_char(${chatMessages.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${chatMessages.createdAt}, 'YYYY-MM') asc`);
    } else if (period === 'custom' && (options?.startDate || options?.endDate)) {
      let whereSql = sql`1=1`;
      if (options.startDate && options.endDate) {
        whereSql = sql`${chatMessages.createdAt} >= ${options.startDate}::timestamptz and ${chatMessages.createdAt} <= ${options.endDate}::timestamptz`;
      } else if (options.startDate) {
        whereSql = sql`${chatMessages.createdAt} >= ${options.startDate}::timestamptz`;
      } else if (options.endDate) {
        whereSql = sql`${chatMessages.createdAt} <= ${options.endDate}::timestamptz`;
      }

      tokenUsageRows = await this.db
        .select({
          date: sql<string>`to_char(${chatMessages.createdAt}, 'YYYY-MM-DD')`,
          tokens: sql<number>`cast(coalesce(sum(${chatMessages.inputTokens} + ${chatMessages.outputTokens}), 0) as integer)`
        })
        .from(chatMessages)
        .where(whereSql)
        .groupBy(sql`to_char(${chatMessages.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${chatMessages.createdAt}, 'YYYY-MM-DD') asc`);
    } else {
      // Default: daily rolling 14 days
      tokenUsageRows = await this.db
        .select({
          date: sql<string>`to_char(${chatMessages.createdAt}, 'YYYY-MM-DD')`,
          tokens: sql<number>`cast(coalesce(sum(${chatMessages.inputTokens} + ${chatMessages.outputTokens}), 0) as integer)`
        })
        .from(chatMessages)
        .where(sql`${chatMessages.createdAt} >= now() - interval '14 days'`)
        .groupBy(sql`to_char(${chatMessages.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${chatMessages.createdAt}, 'YYYY-MM-DD') asc`);
    }

    return {
      newUsersToday: newTodayRes[0]?.count || 0,
      newUsersThisWeek: newWeekRes[0]?.count || 0,
      newUsersThisMonth: newMonthRes[0]?.count || 0,
      activeUsers24h: active24hRes[0]?.count || 0,
      activeUsersWeekly: activeWeekRes[0]?.count || 0,
      activeUsersMonthly: activeMonthRes[0]?.count || 0,
      topModels,
      dailyTokenUsage: tokenUsageRows
    };
  }
}

export class DrizzleUsageRepository implements IUsageRepository {
  constructor(private readonly db: DrizzleDb) {}

  async getSummary(
    userId: string
  ): Promise<{ totalInputTokens: number; totalOutputTokens: number; totalCreditsSpent: number }> {
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

  async getDailyUsage(
    userId: string,
    days: number = 30
  ): Promise<{ date: string; tokens: number; credits: number }[]> {
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

/**
 * SSOT persistence for background worker lifecycle status (see IWorkerStateRepository
 * doc comment in @betrix/domain). `recordCommand` is called by `apps/api` when an admin
 * issues start/pause/stop/restart; `recordReport` is called by `apps/worker` whenever the
 * worker process itself reports live telemetry. Both upsert the same row — Postgres, not
 * the Redis pub/sub transport in between, is what `apps/worker/main.ts` reads on boot to
 * decide whether a worker should auto-start.
 */
export class DrizzleWorkerStateRepository implements IWorkerStateRepository {
  constructor(private readonly db: DrizzleDb) {}

  private mapToDomain(row: typeof workerStates.$inferSelect): WorkerStateRecord {
    return {
      workerId: row.workerId,
      status: row.status as WorkerStatus,
      lastCommand: (row.lastCommand as WorkerAction | null) ?? null,
      lastCommandAt: row.lastCommandAt,
      lastCommandBy: row.lastCommandBy,
      lastReportAt: row.lastReportAt,
      processedCount: row.processedCount,
      errorCount: row.errorCount,
      lastError: row.lastError,
      updatedAt: row.updatedAt
    };
  }

  async findAll(): Promise<WorkerStateRecord[]> {
    const rows = await this.db.select().from(workerStates);
    return rows.map((r) => this.mapToDomain(r));
  }

  async findByWorkerId(workerId: string): Promise<WorkerStateRecord | null> {
    const rows = await this.db
      .select()
      .from(workerStates)
      .where(eq(workerStates.workerId, workerId))
      .limit(1);
    return rows[0] ? this.mapToDomain(rows[0]) : null;
  }

  async recordCommand(
    workerId: string,
    status: WorkerStatus,
    action: WorkerAction,
    adminId: string | null
  ): Promise<WorkerStateRecord> {
    const now = new Date();
    const rows = await this.db
      .insert(workerStates)
      .values({
        workerId,
        status,
        lastCommand: action,
        lastCommandAt: now,
        lastCommandBy: adminId,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: workerStates.workerId,
        set: {
          status,
          lastCommand: action,
          lastCommandAt: now,
          lastCommandBy: adminId,
          updatedAt: now
        }
      })
      .returning();
    return this.mapToDomain(rows[0]!);
  }

  async recordReport(
    workerId: string,
    status: WorkerStatus,
    processedCount: number,
    errorCount: number,
    lastError: string | null
  ): Promise<WorkerStateRecord> {
    const now = new Date();
    const rows = await this.db
      .insert(workerStates)
      .values({
        workerId,
        status,
        lastReportAt: now,
        processedCount,
        errorCount,
        lastError,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: workerStates.workerId,
        set: {
          status,
          lastReportAt: now,
          processedCount,
          errorCount,
          lastError,
          updatedAt: now
        }
      })
      .returning();
    return this.mapToDomain(rows[0]!);
  }
}
