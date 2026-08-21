import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { Nullable, PaginatedResult, PaginationParams } from '@betrix/core';
import { CreditVoucher, IVoucherRepository, VoucherFilter, VoucherSort } from '@betrix/domain';
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

  async findAll(pagination: PaginationParams, filter?: VoucherFilter, sort?: VoucherSort): Promise<PaginatedResult<CreditVoucher>> {
    const offset = (pagination.page - 1) * pagination.limit;
    const whereClause = filter?.isRedeemed !== undefined ? eq(creditVouchers.isRedeemed, filter.isRedeemed) : undefined;

    const sortColumn =
      sort?.sortBy === 'amount' ? creditVouchers.amount
      : sort?.sortBy === 'redeemedAt' ? creditVouchers.redeemedAt
      : creditVouchers.createdAt;
    const order = sort?.sortOrder === 'asc' ? asc : desc;

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(creditVouchers)
        .where(whereClause),
      this.db
        .select()
        .from(creditVouchers)
        .where(whereClause)
        .orderBy(order(sortColumn))
        .limit(pagination.limit)
        .offset(offset)
    ]);
    const total = countResult[0]?.count ?? 0;

    return {
      data: rows.map((r) => this.mapToDomain(r)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit) || 1
    };
  }
}
