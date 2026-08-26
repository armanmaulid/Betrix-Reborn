import { CreditTransaction } from '../entities/CreditTransaction.js';

export interface ICreditRepository {
  recordTransaction(transaction: CreditTransaction): Promise<CreditTransaction>;
  getBalance(userId: string): Promise<number>;
  deductCredits(userId: string, amount: number, action: string): Promise<number>;
  addCredits(userId: string, amount: number, action: string): Promise<number>;
  /**
   * Atomically reserve credits before an expensive operation.
   * Fails (returns false) if available = credits - reservedCredits < amount.
   */
  reserveCredits(userId: string, amount: number): Promise<boolean>;
  /**
   * Settle a reservation: charge actualCost (may exceed reservation — clamped at available),
   * clear the reservation, record the transaction. Returns new balance.
   */
  settleReservation(
    userId: string,
    reservedAmount: number,
    actualCost: number,
    action: string
  ): Promise<number>;
}
