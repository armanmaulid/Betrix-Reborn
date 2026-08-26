import { and, eq, ilike, or, inArray, sql } from 'drizzle-orm';
import { IUserRepository, User, Nullable, PaginatedResult, PaginationParams } from '@betrix/domain';
import { DrizzleDb } from '../drizzle/client.js';
import { users } from '../drizzle/schema.js';

export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly db: DrizzleDb) {}

  private mapToDomain(row: typeof users.$inferSelect): User {
    return new User({
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      name: row.name,
      isAdmin: row.isAdmin,
      status: row.status as 'active' | 'suspended' | 'banned',
      tier: (row.tier as any) || 'free',
      emailVerified: row.emailVerified,
      credits: row.credits,
      googleId: row.googleId,
      phone: row.phone,
      address: row.address,
      birthdate: row.birthdate,
      gender: row.gender,
      bio: row.bio,
      verifiedAt: row.verifiedAt,
      lastActive: row.lastActive,
      createdAt: row.createdAt
    });
  }

  async findById(id: string): Promise<Nullable<User>> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] ? this.mapToDomain(result[0]) : null;
  }

  async findByEmail(email: string): Promise<Nullable<User>> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);
    return result[0] ? this.mapToDomain(result[0]) : null;
  }

  async findByGoogleId(googleId: string): Promise<Nullable<User>> {
    const result = await this.db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    return result[0] ? this.mapToDomain(result[0]) : null;
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const uniqueIds = [...new Set(ids)];
    const rows = await this.db.select().from(users).where(inArray(users.id, uniqueIds));
    return rows.map((r) => this.mapToDomain(r));
  }

  async save(user: User): Promise<User> {
    const inserted = await this.db
      .insert(users)
      .values({
        id: user.id || undefined,
        email: user.email.toLowerCase().trim(),
        passwordHash: user.passwordHash,
        name: user.name,
        isAdmin: user.isAdmin,
        status: user.status,
        tier: user.tier || 'free',
        emailVerified: user.emailVerified,
        credits: user.credits,
        googleId: user.googleId,
        phone: user.phone,
        address: user.address,
        birthdate: user.birthdate,
        gender: user.gender,
        bio: user.bio,
        verifiedAt: user.verifiedAt,
        lastActive: user.lastActive,
        createdAt: user.createdAt
      })
      .returning();

    return this.mapToDomain(inserted[0]!);
  }

  async update(user: User): Promise<User> {
    const updated = await this.db
      .update(users)
      .set({
        email: user.email.toLowerCase().trim(),
        passwordHash: user.passwordHash,
        name: user.name,
        isAdmin: user.isAdmin,
        status: user.status,
        tier: user.tier || 'free',
        emailVerified: user.emailVerified,
        credits: user.credits,
        googleId: user.googleId,
        phone: user.phone,
        address: user.address,
        birthdate: user.birthdate,
        gender: user.gender,
        bio: user.bio,
        verifiedAt: user.verifiedAt,
        lastActive: user.lastActive
      })
      .where(eq(users.id, user.id))
      .returning();

    return this.mapToDomain(updated[0]!);
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.db.delete(users).where(eq(users.id, id)).returning();
    return deleted.length > 0;
  }

  async findAll(
    pagination: PaginationParams,
    search?: string,
    tier?: string
  ): Promise<PaginatedResult<User>> {
    const offset = (pagination.page - 1) * pagination.limit;
    // Escape LIKE wildcards so user input can't force unbounded full scans
    const escaped = search?.replace(/[%_\\]/g, '\\$&');
    const conditions = [];
    if (escaped) {
      conditions.push(or(ilike(users.email, `%${escaped}%`), ilike(users.name, `%${escaped}%`)));
    }
    if (tier) {
      conditions.push(eq(users.tier, tier));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(users)
        .where(whereClause),
      this.db
        .select()
        .from(users)
        .where(whereClause)
        .limit(pagination.limit)
        .offset(offset)
        .orderBy(sql`${users.createdAt} desc`)
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
}
