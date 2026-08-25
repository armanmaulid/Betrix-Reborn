import { Type, Static } from '@sinclair/typebox';

// Register DTO
// NOTE: deviceFingerprint is OPTIONAL and advisory only — the authoritative
// binding key is derived server-side from request IP/user-agent
// (see resolveServerFingerprint).
export const RegisterSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8, maxLength: 128 }),
  name: Type.Optional(Type.String({ minLength: 2, maxLength: 100 })),
  deviceFingerprint: Type.Optional(Type.String({ minLength: 10 })),
  phone: Type.Optional(Type.String()),
  address: Type.Optional(Type.String()),
  birthdate: Type.Optional(Type.String()),
  gender: Type.Optional(Type.String()),
  bio: Type.Optional(Type.String())
});
export type RegisterDTO = Static<typeof RegisterSchema>;

// Login DTO (with Anti-Bruteforce CAPTCHA support)
export const LoginSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 1 }),
  deviceFingerprint: Type.Optional(Type.String({ minLength: 10 })),
  captchaId: Type.Optional(Type.String()),
  captchaAnswer: Type.Optional(Type.String())
});
export type LoginDTO = Static<typeof LoginSchema>;

// Google OAuth DTO
export const GoogleOAuthSchema = Type.Object({
  idToken: Type.String({ minLength: 10 }),
  deviceFingerprint: Type.Optional(Type.String({ minLength: 10 }))
});
export type GoogleOAuthDTO = Static<typeof GoogleOAuthSchema>;

// Email Verification DTO
export const VerifyEmailSchema = Type.Object({
  token: Type.String({ minLength: 10 })
});
export type VerifyEmailDTO = Static<typeof VerifyEmailSchema>;

// Resend Verification DTO
export const ResendVerificationSchema = Type.Object({
  email: Type.String({ format: 'email' })
});
export type ResendVerificationDTO = Static<typeof ResendVerificationSchema>;

// Forgot Password DTO
export const ForgotPasswordSchema = Type.Object({
  email: Type.String({ format: 'email' })
});
export type ForgotPasswordDTO = Static<typeof ForgotPasswordSchema>;

// Reset Password DTO
export const ResetPasswordSchema = Type.Object({
  token: Type.String({ minLength: 10 }),
  newPassword: Type.String({ minLength: 8, maxLength: 128 })
});
export type ResetPasswordDTO = Static<typeof ResetPasswordSchema>;

// Change Password DTO
export const ChangePasswordSchema = Type.Object({
  currentPassword: Type.String({ minLength: 1 }),
  newPassword: Type.String({ minLength: 8, maxLength: 128 })
});
export type ChangePasswordDTO = Static<typeof ChangePasswordSchema>;

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
