import { and, desc, eq, sql } from 'drizzle-orm';
import { Nullable, PaginatedResult, PaginationParams } from '@betrix/core';
import { CreditVoucher, IVoucherRepository } from '@betrix/domain';
import { DrizzleDb } from '../drizzle/client.js';
import { creditVouchers } from '../drizzle/schema.js';

export class DrizzleVoucherRepository implements IVoucherRepository {
  constructor(private readonly db: DrizzleDb) {}

  private mapToDomain(row: typeof creditVouchers.$inferSelect): CreditVoucher {
    return new CreditVoucher({
      id: row.id,
      code: row.code,
      amount: row.amount,
      createdById: row.createdById,
      isRedeemed: row.isRedeemed,
      redeemedById: row.redeemedById,
      redeemedAt: row.redeemedAt,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt
    });
  }

  async create(voucher: CreditVoucher): Promise<CreditVoucher> {
    const inserted = await this.db
      .insert(creditVouchers)
      .values({
        id: voucher.id || undefined,
        code: voucher.code,
        amount: voucher.amount,
        createdById: voucher.createdById,
        isRedeemed: voucher.isRedeemed,
        redeemedById: voucher.redeemedById,
        redeemedAt: voucher.redeemedAt,
        expiresAt: voucher.expiresAt,
        createdAt: voucher.createdAt
      })
      .returning();

    return this.mapToDomain(inserted[0]!);
  }

  async findByCode(code: string): Promise<Nullable<CreditVoucher>> {
    const rows = await this.db
      .select()
      .from(creditVouchers)
      .where(eq(creditVouchers.code, code))
      .limit(1);

    if (rows.length === 0) return null;
    return this.mapToDomain(rows[0]!);
  }

  async findById(id: string): Promise<Nullable<CreditVoucher>> {
    const rows = await this.db
      .select()
      .from(creditVouchers)
      .where(eq(creditVouchers.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return this.mapToDomain(rows[0]!);
  }

  async redeem(voucherId: string, userId: string): Promise<boolean> {
    const result = await this.db
      .update(creditVouchers)
      .set({
        isRedeemed: true,
        redeemedById: userId,
        redeemedAt: new Date()
      })
      .where(and(eq(creditVouchers.id, voucherId), eq(creditVouchers.isRedeemed, false)))
      .returning({ id: creditVouchers.id });

    return result.length > 0;
  }

  async revoke(voucherId: string): Promise<boolean> {
    const result = await this.db
      .delete(creditVouchers)
      .where(eq(creditVouchers.id, voucherId))
      .returning({ id: creditVouchers.id });

    return result.length > 0;
  }

  async findAll(pagination: PaginationParams): Promise<PaginatedResult<CreditVoucher>> {
    const offset = (pagination.page - 1) * pagination.limit;

    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(creditVouchers);
    const total = countResult[0]?.count ?? 0;

    const rows = await this.db
      .select()
      .from(creditVouchers)
      .orderBy(desc(creditVouchers.createdAt))
      .limit(pagination.limit)
      .offset(offset);

    return {
      data: rows.map((r) => this.mapToDomain(r)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit) || 1
    };
  }
}
