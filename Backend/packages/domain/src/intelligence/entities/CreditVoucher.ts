import { Nullable } from '@betrix/core';

export interface CreditVoucherProps {
  id: string;
  code: string;
  amount: number;
  createdById?: Nullable<string>;
  isRedeemed: boolean;
  redeemedById?: Nullable<string>;
  redeemedAt?: Nullable<Date>;
  expiresAt?: Nullable<Date>;
  createdAt: Date;
}

export class CreditVoucher {
  constructor(private readonly props: CreditVoucherProps) {}

  get id(): string {
    return this.props.id;
  }

  get code(): string {
    return this.props.code;
  }

  get amount(): number {
    return this.props.amount;
  }

  get createdById(): Nullable<string> {
    return this.props.createdById || null;
  }

  get isRedeemed(): boolean {
    return this.props.isRedeemed;
  }

  get redeemedById(): Nullable<string> {
    return this.props.redeemedById || null;
  }

  get redeemedAt(): Nullable<Date> {
    return this.props.redeemedAt || null;
  }

  get expiresAt(): Nullable<Date> {
    return this.props.expiresAt || null;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  public isExpired(): boolean {
    if (!this.props.expiresAt) return false;
    return new Date() > this.props.expiresAt;
  }

  public isValid(): boolean {
    return !this.props.isRedeemed && !this.isExpired();
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.props.id,
      code: this.props.code,
      amount: this.props.amount,
      createdById: this.props.createdById,
      isRedeemed: this.props.isRedeemed,
      redeemedById: this.props.redeemedById,
      redeemedAt: this.props.redeemedAt?.toISOString() || null,
      expiresAt: this.props.expiresAt?.toISOString() || null,
      createdAt: this.props.createdAt.toISOString()
    };
  }
}
