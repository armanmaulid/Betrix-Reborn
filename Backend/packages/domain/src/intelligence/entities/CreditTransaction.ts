export interface CreditTransactionProps {
  id: string;
  userId: string;
  amount: number;
  action: string;
  createdAt: Date;
}

export class CreditTransaction {
  public readonly id: string;
  public readonly userId: string;
  public readonly amount: number;
  public readonly action: string;
  public readonly createdAt: Date;

  constructor(props: CreditTransactionProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.amount = props.amount;
    this.action = props.action;
    this.createdAt = props.createdAt;
  }

  /** True if this transaction deducted credits (negative amount) */
  public isDeduction(): boolean {
    return this.amount < 0;
  }

  /** True if this transaction added credits (positive amount) */
  public isAddition(): boolean {
    return this.amount > 0;
  }

  /** Absolute value of the credit change */
  public absoluteAmount(): number {
    return Math.abs(this.amount);
  }
}
