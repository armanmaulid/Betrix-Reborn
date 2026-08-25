import { and, desc, eq, sql } from 'drizzle-orm';
import { ICreditRepository, CreditTransaction } from '@betrix/domain';
import { DrizzleDb } from '../drizzle/client.js';
import { creditTransactions, users } from '../drizzle/schema.js';

export class DrizzleCreditRepository implements ICreditRepository {
  constructor(private readonly db: DrizzleDb) {}

  private mapToDomain(row: typeof creditTransactions.$inferSelect): CreditTransaction {
    return new CreditTransaction({
      id: row.id,
      userId: row.userId,
      amount: row.amount,
      action: row.action,
      createdAt: row.createdAt
    });
  }

  async recordTransaction(transaction: CreditTransaction): Promise<CreditTransaction> {
    const inserted = await this.db
      .insert(creditTransactions)
      .values({
        id: transaction.id || undefined,
        userId: transaction.userId,
        amount: transaction.amount,
        action: transaction.action,
        createdAt: transaction.createdAt
      })
      .returning();

    return this.mapToDomain(inserted[0]!);
  }

  async getBalance(userId: string): Promise<number> {
    const result = await this.db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return result[0]?.credits ?? 0;
  }

  async deductCredits(userId: string, amount: number, action: string): Promise<number> {
    return await this.db.transaction(async (tx) => {
      // Deduct from user
      const updatedUser = await tx
        .update(users)
        .set({
          credits: sql`GREATEST(0, ${users.credits} - ${amount})`
        })
        .where(eq(users.id, userId))
        .returning({ credits: users.credits });

      // Record transaction
      await tx.insert(creditTransactions).values({
        userId,
        amount: -amount,
        action,
        createdAt: new Date()
      });

      return updatedUser[0]?.credits ?? 0;
    });
  }

  async addCredits(userId: string, amount: number, action: string): Promise<number> {
    return await this.db.transaction(async (tx) => {
      const updatedUser = await tx
        .update(users)
        .set({
          credits: sql`${users.credits} + ${amount}`
        })
        .where(eq(users.id, userId))
        .returning({ credits: users.credits });

      await tx.insert(creditTransactions).values({
        userId,
        amount,
        action,
        createdAt: new Date()
      });

      return updatedUser[0]?.credits ?? 0;
    });
  }

  async reserveCredits(userId: string, amount: number): Promise<boolean> {
    const result = await this.db
      .update(users)
      .set({ reservedCredits: sql`${users.reservedCredits} + ${amount}` })
      .where(
        and(eq(users.id, userId), sql`${users.credits} - ${users.reservedCredits} >= ${amount}`)
      )
      .returning({ reservedCredits: users.reservedCredits });
    return result.length > 0;
  }

  async settleReservation(
    userId: string,
    reservedAmount: number,
    actualCost: number,
    action: string
  ): Promise<number> {
    return await this.db.transaction(async (tx) => {
      // Charge actual cost (floor 0), release exactly this reservation.
      // ponytail: actualCost > reservedAmount is allowed to under-charge — ceiling
      // is maxTokens-aware reservation set by the caller. Fine at current rates.
      const updated = await tx
        .update(users)
        .set({
          credits: sql`GREATEST(0, ${users.credits} - ${actualCost})`,
          reservedCredits: sql`GREATEST(0, ${users.reservedCredits} - ${reservedAmount})`
        })
        .where(eq(users.id, userId))
        .returning({ credits: users.credits });

      await tx.insert(creditTransactions).values({
        userId,
        amount: -actualCost,
        action,
        createdAt: new Date()
      });

      return updated[0]?.credits ?? 0;
    });
  }

  async getHistory(userId: string, limit: number = 50): Promise<CreditTransaction[]> {
    const rows = await this.db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit);

    return rows.map((r) => this.mapToDomain(r));
  }
}
