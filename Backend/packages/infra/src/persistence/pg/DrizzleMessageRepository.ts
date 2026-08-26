import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import {
  IMessageRepository,
  Message,
  NotificationPreference,
  Nullable,
  PaginatedResult,
  PaginationParams
} from '@betrix/domain';
import { DrizzleDb } from '../drizzle/client.js';
import { messages, notificationPreferences } from '../drizzle/schema.js';

export class DrizzleMessageRepository implements IMessageRepository {
  constructor(private readonly db: DrizzleDb) {}

  private mapMessageToDomain(row: typeof messages.$inferSelect): Message {
    return new Message({
      id: row.id,
      fromUserId: row.fromUserId,
      toUserId: row.toUserId,
      subject: row.subject,
      body: row.body,
      threadId: row.threadId,
      replyToMessageId: row.replyToMessageId,
      readAt: row.readAt,
      deletedAt: row.deletedAt,
      createdAt: row.createdAt
    });
  }

  async save(msg: Message): Promise<Message> {
    const inserted = await this.db
      .insert(messages)
      .values({
        id: msg.id || undefined,
        fromUserId: msg.fromUserId,
        toUserId: msg.toUserId,
        subject: msg.subject,
        body: msg.body,
        threadId: msg.threadId,
        replyToMessageId: msg.replyToMessageId,
        readAt: msg.readAt,
        deletedAt: msg.deletedAt,
        createdAt: msg.createdAt
      })
      .returning();

    return this.mapMessageToDomain(inserted[0]!);
  }

  /** T4.6 — single multi-row INSERT for broadcast fan-out. */
  async saveMany(msgs: Message[]): Promise<number> {
    if (msgs.length === 0) return 0;
    const inserted = await this.db
      .insert(messages)
      .values(
        msgs.map((msg) => ({
          id: msg.id || undefined,
          fromUserId: msg.fromUserId,
          toUserId: msg.toUserId,
          subject: msg.subject,
          body: msg.body,
          threadId: msg.threadId,
          replyToMessageId: msg.replyToMessageId,
          readAt: null,
          createdAt: msg.createdAt
        }))
      )
      .returning({ id: messages.id });
    return inserted.length;
  }

  async findById(id: string): Promise<Nullable<Message>> {
    const result = await this.db.select().from(messages).where(eq(messages.id, id)).limit(1);
    return result[0] ? this.mapMessageToDomain(result[0]) : null;
  }

  async findInbox(userId: string, pagination: PaginationParams): Promise<PaginatedResult<Message>> {
    const offset = (pagination.page - 1) * pagination.limit;
    const whereClause = and(eq(messages.toUserId, userId), isNull(messages.deletedAt));

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(messages)
        .where(whereClause),
      this.db
        .select()
        .from(messages)
        .where(whereClause)
        .limit(pagination.limit)
        .offset(offset)
        .orderBy(desc(messages.createdAt))
    ]);

    const total = countResult[0]?.count || 0;
    return {
      data: rows.map((r) => this.mapMessageToDomain(r)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit)
    };
  }

  async findSent(userId: string, pagination: PaginationParams): Promise<PaginatedResult<Message>> {
    const offset = (pagination.page - 1) * pagination.limit;
    const whereClause = eq(messages.fromUserId, userId);

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(messages)
        .where(whereClause),
      this.db
        .select()
        .from(messages)
        .where(whereClause)
        .limit(pagination.limit)
        .offset(offset)
        .orderBy(desc(messages.createdAt))
    ]);

    const total = countResult[0]?.count || 0;
    return {
      data: rows.map((r) => this.mapMessageToDomain(r)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit)
    };
  }

  async findThread(threadId: string, userId: string): Promise<Message[]> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.threadId, threadId),
          or(eq(messages.fromUserId, userId), eq(messages.toUserId, userId))
        )
      )
      .orderBy(messages.createdAt);

    return rows.map((r) => this.mapMessageToDomain(r));
  }

  async markAsRead(id: string, userId: string): Promise<boolean> {
    const updated = await this.db
      .update(messages)
      .set({ readAt: new Date() })
      .where(and(eq(messages.id, id), eq(messages.toUserId, userId)))
      .returning();
    return updated.length > 0;
  }

  async softDelete(id: string, userId: string): Promise<boolean> {
    const updated = await this.db
      .update(messages)
      .set({ deletedAt: new Date() })
      .where(and(eq(messages.id, id), eq(messages.toUserId, userId)))
      .returning();
    return updated.length > 0;
  }

  async getNotificationPreference(userId: string): Promise<Nullable<NotificationPreference>> {
    const result = await this.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    if (!result[0]) return null;
    return new NotificationPreference({
      userId: result[0].userId,
      emailNotifications: result[0].emailNotifications,
      pushNotifications: result[0].pushNotifications,
      createdAt: result[0].createdAt,
      updatedAt: result[0].updatedAt
    });
  }

  async saveNotificationPreference(pref: NotificationPreference): Promise<NotificationPreference> {
    const inserted = await this.db
      .insert(notificationPreferences)
      .values({
        userId: pref.userId,
        emailNotifications: pref.emailNotifications,
        pushNotifications: pref.pushNotifications,
        createdAt: pref.createdAt,
        updatedAt: pref.updatedAt
      })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: {
          emailNotifications: pref.emailNotifications,
          pushNotifications: pref.pushNotifications,
          updatedAt: new Date()
        }
      })
      .returning();

    return new NotificationPreference({
      userId: inserted[0]!.userId,
      emailNotifications: inserted[0]!.emailNotifications,
      pushNotifications: inserted[0]!.pushNotifications,
      createdAt: inserted[0]!.createdAt,
      updatedAt: inserted[0]!.updatedAt
    });
  }
}
