export interface CreditVoucherProps {
  id: string;
  code: string;
  amount: number;
  isRedeemed: boolean;
  redeemedById?: string | null;
  redeemedAt?: string | Date | null;
  expiresAt?: string | Date | null;
  createdById: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export type VoucherStatus = 'available' | 'redeemed' | 'expired';

export class CreditVoucher {
  public readonly id: string;
  public readonly code: string;
  public readonly amount: number;
  public readonly isRedeemed: boolean;
  public readonly redeemedById: string | null;
  public readonly redeemedAt: Date | null;
  public readonly expiresAt: Date | null;
  public readonly createdById: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date | null;

  constructor(props: CreditVoucherProps) {
    this.id = props.id;
    this.code = props.code.toUpperCase().trim();
    this.amount = props.amount;
    this.isRedeemed = props.isRedeemed;
    this.redeemedById = props.redeemedById ?? null;
    this.redeemedAt = props.redeemedAt
      ? typeof props.redeemedAt === 'string'
        ? new Date(props.redeemedAt)
        : props.redeemedAt
      : null;
    this.expiresAt = props.expiresAt
      ? typeof props.expiresAt === 'string'
        ? new Date(props.expiresAt)
        : props.expiresAt
      : null;
    this.createdById = props.createdById;
    this.createdAt =
      typeof props.createdAt === 'string' ? new Date(props.createdAt) : props.createdAt;
    this.updatedAt = props.updatedAt
      ? typeof props.updatedAt === 'string'
        ? new Date(props.updatedAt)
        : props.updatedAt
      : null;
  }

  public isExpired(): boolean {
    if (!this.expiresAt) return false;
    return Date.now() > this.expiresAt.getTime();
  }

  public isValid(): boolean {
    return !this.isRedeemed && !this.isExpired();
  }

  public getStatus(): VoucherStatus {
    if (this.isRedeemed) return 'redeemed';
    if (this.isExpired()) return 'expired';
    return 'available';
  }

  public getStatusBadgeClass(): string {
    switch (this.getStatus()) {
      case 'available':
        return 'border-positive/40 bg-positive/10 text-positive';
      case 'redeemed':
        return 'border-border bg-black text-muted-foreground';
      case 'expired':
        return 'border-negative/40 bg-negative/10 text-negative';
    }
  }
}
