import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { Nullable, PaginatedResult, PaginationParams } from '@betrix/core';
import {
  AtomicRedeemResult,
  CreditVoucher,
  IVoucherRepository,
  VoucherFilter,
  VoucherSort
} from '@betrix/domain';
import { DrizzleDb } from '../drizzle/client.js';
import { creditTransactions, creditVouchers, users } from '../drizzle/schema.js';

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

  /**
   * Single-transaction redemption: conditional voucher burn + credit grant +
   * ledger entry commit together or not at all. Prevents the "voucher burned
   * but credits never granted" integrity failure of the two-step flow.
   */
  async redeemAtomically(
    voucherId: string,
    userId: string,
    amount: number,
    action: string
  ): Promise<AtomicRedeemResult> {
    return await this.db.transaction(async (tx) => {
      // 1. Conditional burn — only wins if still unredeemed.
      const burned = await tx
        .update(creditVouchers)
        .set({ isRedeemed: true, redeemedById: userId, redeemedAt: new Date() })
        .where(and(eq(creditVouchers.id, voucherId), eq(creditVouchers.isRedeemed, false)))
        .returning({ id: creditVouchers.id });

      if (burned.length === 0) {
        return { redeemed: false, newBalance: 0 };
      }

      // 2. Grant credits + ledger entry inside the SAME transaction.
      const updatedUser = await tx
        .update(users)
        .set({ credits: sql`${users.credits} + ${amount}` })
        .where(eq(users.id, userId))
        .returning({ credits: users.credits });

      await tx.insert(creditTransactions).values({
        userId,
        amount,
        action,
        createdAt: new Date()
      });

      return { redeemed: true, newBalance: updatedUser[0]?.credits ?? 0 };
    });
  }

  async revoke(voucherId: string): Promise<boolean> {
    const result = await this.db
      .delete(creditVouchers)
      .where(eq(creditVouchers.id, voucherId))
      .returning({ id: creditVouchers.id });

    return result.length > 0;
  }

  /** T4.6 — single-statement batch revoke replaces the N+1 loop. */
  async revokeMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await this.db
      .update(creditVouchers)
      .set({ isRedeemed: true, redeemedAt: new Date() })
      .where(and(inArray(creditVouchers.id, ids), eq(creditVouchers.isRedeemed, false)))
      .returning({ id: creditVouchers.id });
    return result.length;
  }

  async findAll(
    pagination: PaginationParams,
    filter?: VoucherFilter,
    sort?: VoucherSort
  ): Promise<PaginatedResult<CreditVoucher>> {
    const offset = (pagination.page - 1) * pagination.limit;
    const whereClause =
      filter?.isRedeemed !== undefined
        ? eq(creditVouchers.isRedeemed, filter.isRedeemed)
        : undefined;

    const sortColumn =
      sort?.sortBy === 'amount'
        ? creditVouchers.amount
        : sort?.sortBy === 'redeemedAt'
          ? creditVouchers.redeemedAt
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

  /** T4.5 — retention: purge vouchers redeemed before `cutoff`, or expired
   *  (unredeemed) before `cutoff`. */
  async deleteExpiredOlderThan(cutoff: Date): Promise<number> {
    const deleted = await this.db
      .delete(creditVouchers)
      .where(
        or(
          and(eq(creditVouchers.isRedeemed, true), lt(creditVouchers.redeemedAt, cutoff)),
          and(isNull(creditVouchers.redeemedAt), lt(creditVouchers.expiresAt, cutoff))
        )
      )
      .returning({ id: creditVouchers.id });
    return deleted.length;
  }
}
