import { Type, Static } from '@sinclair/typebox';

// Change Email DTO
export const ChangeEmailSchema = Type.Object({
  newEmail: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 1 })
});
export type ChangeEmailDTO = Static<typeof ChangeEmailSchema>;

// Update Profile DTO
export const UpdateProfileSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 2, maxLength: 100 })),
  phone: Type.Optional(Type.String()),
  address: Type.Optional(Type.String()),
  birthdate: Type.Optional(Type.String()),
  gender: Type.Optional(Type.String()),
  bio: Type.Optional(Type.String())
});
export type UpdateProfileDTO = Static<typeof UpdateProfileSchema>;

// Redeem Credit Voucher DTO (ADR-29)
export const RedeemVoucherSchema = Type.Object({
  code: Type.String({ minLength: 4, maxLength: 64 })
});
export type RedeemVoucherDTO = Static<typeof RedeemVoucherSchema>;
