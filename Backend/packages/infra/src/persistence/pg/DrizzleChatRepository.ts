import { and, desc, eq, sql } from 'drizzle-orm';
import { IChatRepository, ChatMessage, PaginatedResult, PaginationParams } from '@betrix/domain';
import { DrizzleDb } from '../drizzle/client.js';
import { chatMessages } from '../drizzle/schema.js';

export class DrizzleChatRepository implements IChatRepository {
  constructor(private readonly db: DrizzleDb) {}

  private mapToDomain(row: typeof chatMessages.$inferSelect): ChatMessage {
    return new ChatMessage({
      id: row.id,
      userId: row.userId,
      sessionId: row.sessionId,
      taskType: row.taskType,
      modelUsed: row.modelUsed,
      message: row.message,
      reply: row.reply,
      latencyMs: row.latencyMs,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      createdAt: row.createdAt
    });
  }

  async save(message: ChatMessage): Promise<ChatMessage> {
    const inserted = await this.db
      .insert(chatMessages)
      .values({
        id: message.id || undefined,
        userId: message.userId,
        sessionId: message.sessionId,
        taskType: message.taskType,
        modelUsed: message.modelUsed,
        message: message.message,
        reply: message.reply,
        latencyMs: message.latencyMs,
        inputTokens: message.inputTokens,
        outputTokens: message.outputTokens,
        createdAt: message.createdAt
      })
      .returning();

    return this.mapToDomain(inserted[0]!);
  }

  async findByUserId(
    userId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResult<ChatMessage>> {
    const offset = (pagination.page - 1) * pagination.limit;
    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(chatMessages)
        .where(eq(chatMessages.userId, userId)),
      this.db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.userId, userId))
        .limit(pagination.limit)
        .offset(offset)
        .orderBy(desc(chatMessages.createdAt))
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

  async findBySessionId(sessionId: string, userId: string): Promise<ChatMessage[]> {
    const rows = await this.db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.sessionId, sessionId), eq(chatMessages.userId, userId)))
      .orderBy(chatMessages.createdAt);

    return rows.map((r) => this.mapToDomain(r));
  }

  async findRecentBySessionId(
    sessionId: string,
    userId: string,
    limit: number
  ): Promise<ChatMessage[]> {
    // Latest N by createdAt, re-reversed to chronological — avoids loading full
    // session (long sessions carry full LLM replies as text) on every send.
    const rows = await this.db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.sessionId, sessionId), eq(chatMessages.userId, userId)))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);

    return rows.reverse().map((r) => this.mapToDomain(r));
  }

  async deleteSession(sessionId: string, userId: string): Promise<number> {
    const deleted = await this.db
      .delete(chatMessages)
      .where(and(eq(chatMessages.sessionId, sessionId), eq(chatMessages.userId, userId)))
      .returning();

    return deleted.length;
  }
}
