import { CreditTransaction } from '../entities/CreditTransaction.js';

export interface ICreditRepository {
  recordTransaction(transaction: CreditTransaction): Promise<CreditTransaction>;
  getBalance(userId: string): Promise<number>;
  deductCredits(userId: string, amount: number, action: string): Promise<number>;
  addCredits(userId: string, amount: number, action: string): Promise<number>;
  getHistory(userId: string, limit?: number): Promise<CreditTransaction[]>;
}
