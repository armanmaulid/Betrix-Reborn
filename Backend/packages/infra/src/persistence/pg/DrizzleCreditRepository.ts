import { and, eq, sql } from 'drizzle-orm';
import { AppError } from '@betrix/core';
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

  /**
   * Unconditional-looking deduction hardened with a sufficiency predicate:
   * returns -1 when the balance would go negative instead of clamping to 0
   * (which previously allowed silent free usage). Currently only used by
   * legacy call paths — live AI chat flows use reserveCredits/settleReservation.
   */
  async deductCredits(userId: string, amount: number, action: string): Promise<number> {
    return await this.db.transaction(async (tx) => {
      const updatedUser = await tx
        .update(users)
        .set({
          credits: sql`${users.credits} - ${amount}`
        })
        .where(and(eq(users.id, userId), sql`${users.credits} >= ${amount}`))
        .returning({ credits: users.credits });

      if (updatedUser.length === 0) {
        throw new AppError('Insufficient balance for this operation.', 402); // insufficient balance
      }

      // Record transaction
      await tx.insert(creditTransactions).values({
        userId,
        amount: -amount,
        action,
        createdAt: new Date()
      });

      return updatedUser[0]!.credits;
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

  /**
   * T5.0b — reserve with an expiry marker. `reserved_until` lets the sweeper
   * (scripts/ops/012) release holds that were never settled (crash/partition)
   * instead of leaking the credit hold forever.
   */
  async reserveCredits(userId: string, amount: number): Promise<boolean> {
    const result = await this.db
      .update(users)
      .set({
        reservedCredits: sql`${users.reservedCredits} + ${amount}`,
        reservedUntil: sql`NOW() + INTERVAL '30 minutes'`
      })
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
      // Serialize concurrent settlements per user so the charge computation
      // below cannot race with other reserve/settle operations.
      const current = await tx
        .select({ credits: users.credits, reserved: users.reservedCredits })
        .from(users)
        .where(eq(users.id, userId))
        .for('update')
        .limit(1);

      const row = current[0];
      if (!row) return 0;

      // Charge is capped by BOTH the reservation and the available balance —
      // an over-budget completion can never pull the balance below zero or
      // grant free usage beyond what was reserved.
      const charge = Math.max(0, Math.min(actualCost, reservedAmount, row.credits));

      const updated = await tx
        .update(users)
        .set({
          credits: sql`${users.credits} - ${charge}`,
          reservedCredits: sql`GREATEST(0, ${users.reservedCredits} - ${reservedAmount})`,
          // Clear the hold marker only once the reservation is fully drained.
          reservedUntil: sql`CASE WHEN GREATEST(0, ${users.reservedCredits} - ${reservedAmount}) = 0 THEN NULL ELSE ${users.reservedUntil} END`
        })
        .where(eq(users.id, userId))
        .returning({ credits: users.credits });

      if (charge > 0) {
        await tx.insert(creditTransactions).values({
          userId,
          amount: -charge,
          action,
          createdAt: new Date()
        });
      }

      return updated[0]?.credits ?? row.credits - charge;
    });
  }
}
