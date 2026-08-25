import { eq, lt } from 'drizzle-orm';
import { ISessionRepository, Session, Nullable } from '@betrix/domain';
import { DrizzleDb } from '../drizzle/client.js';
import { sessions } from '../drizzle/schema.js';
import { hashTokenForStorage } from './token-hash.js';

/**
 * Session tokens are stored as SHA-256 digests (see token-hash.ts): the raw
 * value exists only in the issued response / JWT payload. NOTE: deploying
 * this change invalidates pre-existing sessions once (they were stored
 * plaintext) — users simply log in again.
 */
export class DrizzleSessionRepository implements ISessionRepository {
  constructor(private readonly db: DrizzleDb) {}

  private mapToDomain(row: typeof sessions.$inferSelect): Session {
    return new Session({
      id: row.id,
      userId: row.userId,
      token: row.token,
      deviceFingerprint: row.deviceFingerprint,
      ip: row.ip,
      userAgent: row.userAgent,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt
    });
  }

  async findById(id: string): Promise<Nullable<Session>> {
    const result = await this.db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    return result[0] ? this.mapToDomain(result[0]) : null;
  }

  async findByToken(token: string): Promise<Nullable<Session>> {
    const result = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.token, hashTokenForStorage(token)))
      .limit(1);
    return result[0] ? this.mapToDomain(result[0]) : null;
  }

  async findByUserId(userId: string): Promise<Session[]> {
    const rows = await this.db.select().from(sessions).where(eq(sessions.userId, userId));
    return rows.map((r) => this.mapToDomain(r));
  }

  async save(session: Session): Promise<Session> {
    const inserted = await this.db
      .insert(sessions)
      .values({
        id: session.id || undefined,
        userId: session.userId,
        token: hashTokenForStorage(session.token),
        deviceFingerprint: session.deviceFingerprint,
        ip: session.ip,
        userAgent: session.userAgent,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt
      })
      .returning();

    return this.mapToDomain(inserted[0]!);
  }

  async delete(token: string): Promise<boolean> {
    const deleted = await this.db
      .delete(sessions)
      .where(eq(sessions.token, hashTokenForStorage(token)))
      .returning();
    return deleted.length > 0;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const deleted = await this.db.delete(sessions).where(eq(sessions.userId, userId)).returning();
    return deleted.length;
  }

  async deleteExpired(): Promise<number> {
    const deleted = await this.db
      .delete(sessions)
      .where(lt(sessions.expiresAt, new Date()))
      .returning();
    return deleted.length;
  }
}
