import { ValidationError, NotFoundError } from '@betrix/core';
import { IVoucherRepository, ICreditRepository } from '@betrix/domain';
import { RedeemVoucherDTO } from '../../schemas/auth.schema.js';

export interface RedeemVoucherResult {
  success: boolean;
  amount: number;
  newBalance: number;
  message: string;
}

export class RedeemVoucherUseCase {
  constructor(
    private readonly voucherRepo: IVoucherRepository,
    private readonly creditRepo: ICreditRepository
  ) {}

  public async execute(userId: string, dto: RedeemVoucherDTO): Promise<RedeemVoucherResult> {
    const code = dto.code.trim().toUpperCase();
    const voucher = await this.voucherRepo.findByCode(code);

    if (!voucher) {
      throw new NotFoundError('Invalid voucher code.');
    }

    if (voucher.isRedeemed) {
      throw new ValidationError('This voucher has already been redeemed.');
    }

    if (voucher.isExpired()) {
      throw new ValidationError('This voucher has expired.');
    }

    // Atomic redemption: voucher burn + credit grant + ledger entry commit in
    // ONE transaction — the voucher can never be consumed without its credits
    // being granted (and concurrent double-redemptions stay impossible).
    const { redeemed, newBalance } = await this.voucherRepo.redeemAtomically(
      voucher.id,
      userId,
      voucher.amount,
      `VOUCHER_REDEMPTION:${voucher.code}`
    );

    if (!redeemed) {
      throw new ValidationError('Failed to redeem voucher.');
    }

    return {
      success: true,
      amount: voucher.amount,
      newBalance,
      message: `Successfully redeemed ${voucher.amount} credits.`
    };
  }
}
