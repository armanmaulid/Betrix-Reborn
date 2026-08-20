import { Type, Static } from '@sinclair/typebox';

// Admin Users Query
export const AdminUsersQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  search: Type.Optional(Type.String())
});
export type AdminUsersQueryDTO = Static<typeof AdminUsersQuerySchema>;

// Update User by Admin DTO
export const UpdateAdminUserSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 2, maxLength: 100 })),
  isAdmin: Type.Optional(Type.Boolean()),
  status: Type.Optional(Type.Union([Type.Literal('active'), Type.Literal('suspended'), Type.Literal('banned')])),
  credits: Type.Optional(Type.Integer({ minimum: 0 }))
});
export type UpdateAdminUserDTO = Static<typeof UpdateAdminUserSchema>;

// Admin Reset User Password DTO
export const ResetUserPasswordSchema = Type.Object({
  newPassword: Type.String({ minLength: 8, maxLength: 128 })
});
export type ResetUserPasswordDTO = Static<typeof ResetUserPasswordSchema>;

// Create Credit Voucher by Admin DTO (ADR-29)
export const CreateVoucherSchema = Type.Object({
  code: Type.Optional(Type.String({ minLength: 4, maxLength: 64 })),
  amount: Type.Integer({ minimum: 1, maximum: 1000000 }),
  expiresAt: Type.Optional(Type.String({ format: 'date-time' }))
});
export type CreateVoucherDTO = Static<typeof CreateVoucherSchema>;

// Broadcast Message DTO
export const BroadcastMessageSchema = Type.Object({
  subject: Type.String({ minLength: 1, maxLength: 255 }),
  body: Type.String({ minLength: 1, maxLength: 5000 }),
  targetUserIds: Type.Optional(Type.Array(Type.String()))
});
export type BroadcastMessageDTO = Static<typeof BroadcastMessageSchema>;

// Audit Log Query
export const AuditLogQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 50 })),
  actionType: Type.Optional(Type.String())
});
export type AuditLogQueryDTO = Static<typeof AuditLogQuerySchema>;

// System Cleanup DTO
export const SystemCleanupSchema = Type.Object({
  olderThanDays: Type.Optional(Type.Integer({ minimum: 1, default: 30 }))
});
export type SystemCleanupDTO = Static<typeof SystemCleanupSchema>;
