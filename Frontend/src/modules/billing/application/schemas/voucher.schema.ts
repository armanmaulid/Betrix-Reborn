import { z } from 'zod';

/**
 * Billing-owned schema for credit voucher issuance.
 * (Moved out of operations/admin.schema so the billing module owns its
 * own contract.)
 */
export const CreateVoucherSchema = z.object({
  code: z
    .string()
    .min(4, 'Code must be at least 4 characters')
    .max(64, 'Code cannot exceed 64 characters')
    .optional()
    .or(z.literal('')),
  amount: z.coerce
    .number()
    .int()
    .min(1, 'Amount must be at least 1 credit')
    .max(1000000, 'Amount cannot exceed 1,000,000 credits'),
  expiresAt: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), {
      message: 'Expiration must be a valid date/time'
    })
});
export type CreateVoucherInput = z.infer<typeof CreateVoucherSchema>;
