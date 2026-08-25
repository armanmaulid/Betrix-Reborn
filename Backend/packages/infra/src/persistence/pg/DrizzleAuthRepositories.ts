import { and, eq, gte, lt, sql } from 'drizzle-orm';
import {
  ILoginAttemptRepository,
  IVerificationRepository,
  VerificationRecord,
  Nullable
} from '@betrix/domain';
import { DrizzleDb } from '../drizzle/client.js';
import { failedLoginAttempts, verificationTokens } from '../drizzle/schema.js';
import { hashTokenForStorage } from './token-hash.js';

export class DrizzleLoginAttemptRepository implements ILoginAttemptRepository {
  constructor(private readonly db: DrizzleDb) {}

  async countRecentFailures(email: string, windowMinutes: number = 15): Promise<number> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const result = await this.db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(failedLoginAttempts)
      .where(
        and(
          eq(failedLoginAttempts.email, email.toLowerCase().trim()),
          gte(failedLoginAttempts.createdAt, windowStart)
        )
      );

    return result[0]?.count || 0;
  }

  async recordFailedLogin(email: string, ip?: string): Promise<void> {
    await this.db.insert(failedLoginAttempts).values({
      email: email.toLowerCase().trim(),
      ip: ip ?? null,
      createdAt: new Date()
    });
  }

  async clearFailedLogins(email: string): Promise<void> {
    await this.db
      .delete(failedLoginAttempts)
      .where(eq(failedLoginAttempts.email, email.toLowerCase().trim()));
  }

  async cleanupOlderThan(days: number = 7): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const deleted = await this.db
      .delete(failedLoginAttempts)
      .where(lt(failedLoginAttempts.createdAt, cutoff))
      .returning();

    return deleted.length;
  }
}

export class DrizzleVerificationRepository implements IVerificationRepository {
  constructor(private readonly db: DrizzleDb) {}

  async create(
    userId: string,
    token: string,
    type: string,
    ttlMinutes: number = 60
  ): Promise<VerificationRecord> {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const inserted = await this.db
      .insert(verificationTokens)
      .values({
        userId,
        // Stored as a digest — a DB leak must not yield usable email links.
        token: hashTokenForStorage(token),
        type,
        expiresAt,
        createdAt: new Date()
      })
      .returning();

    const row = inserted[0]!;
    return {
      id: row.id,
      userId: row.userId,
      token, // echo the RAW token back to the caller (goes into the email link)
      type: row.type,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt
    };
  }

  async verify(token: string, type: string): Promise<Nullable<VerificationRecord>> {
    // ATOMIC single-use consume: DELETE ... RETURNING removes the replay
    // window of the previous SELECT-then-DELETE (two concurrent requests with
    // the same token could both read it before either deleted it).
    const deleted = await this.db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.token, hashTokenForStorage(token)),
          eq(verificationTokens.type, type),
          gte(verificationTokens.expiresAt, new Date())
        )
      )
      .returning();

    const row = deleted[0];
    if (!row) return null;

    return {
      id: row.id,
      userId: row.userId,
      token,
      type: row.type,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt
    };
  }

  async invalidateUserTokens(userId: string, type: string): Promise<number> {
    const deleted = await this.db
      .delete(verificationTokens)
      .where(and(eq(verificationTokens.userId, userId), eq(verificationTokens.type, type)))
      .returning();

    return deleted.length;
  }

  async cleanupExpired(): Promise<number> {
    const deleted = await this.db
      .delete(verificationTokens)
      .where(lt(verificationTokens.expiresAt, new Date()))
      .returning();

    return deleted.length;
  }
}
