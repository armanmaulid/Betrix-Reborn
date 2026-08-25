import { Type, Static } from '@sinclair/typebox';

export const UserTierSchema = Type.Union([
  Type.Literal('free'),
  Type.Literal('starter'),
  Type.Literal('pro'),
  Type.Literal('premium'),
  Type.Literal('vip')
]);

// Admin Users Query
export const AdminUsersQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  search: Type.Optional(Type.String()),
  tier: Type.Optional(UserTierSchema)
});
export type AdminUsersQueryDTO = Static<typeof AdminUsersQuerySchema>;

// Update User by Admin DTO
export const UpdateAdminUserSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 2, maxLength: 100 })),
  isAdmin: Type.Optional(Type.Boolean()),
  status: Type.Optional(
    Type.Union([Type.Literal('active'), Type.Literal('suspended'), Type.Literal('banned')])
  ),
  tier: Type.Optional(UserTierSchema),
  credits: Type.Optional(Type.Integer({ minimum: 0 }))
});
export type UpdateAdminUserDTO = Static<typeof UpdateAdminUserSchema>;

// Admin Create User DTO
export const CreateAdminUserSchema = Type.Object({
  email: Type.String({ format: 'email', maxLength: 255 }),
  name: Type.String({ minLength: 2, maxLength: 100 }),
  password: Type.Optional(Type.String({ minLength: 8, maxLength: 128 })),
  credits: Type.Optional(Type.Integer({ minimum: 0, default: 100 })),
  isAdmin: Type.Optional(Type.Boolean({ default: false })),
  tier: Type.Optional(Type.Union([UserTierSchema], { default: 'free' }))
});
export type CreateAdminUserDTO = Static<typeof CreateAdminUserSchema>;

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

// List Vouchers Query
export const ListVouchersQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  isRedeemed: Type.Optional(Type.Boolean()),
  sortBy: Type.Optional(
    Type.Union([Type.Literal('createdAt'), Type.Literal('amount'), Type.Literal('redeemedAt')], {
      default: 'createdAt'
    })
  ),
  sortOrder: Type.Optional(
    Type.Union([Type.Literal('asc'), Type.Literal('desc')], { default: 'desc' })
  )
});
export type ListVouchersQueryDTO = Static<typeof ListVouchersQuerySchema>;

// Batch Revoke Vouchers DTO
export const BatchRevokeVouchersSchema = Type.Object({
  ids: Type.Array(Type.String({ format: 'uuid' }), { minItems: 1, maxItems: 100 })
});
export type BatchRevokeVouchersDTO = Static<typeof BatchRevokeVouchersSchema>;

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
  actionType: Type.Optional(Type.String()),
  action: Type.Optional(Type.String()),
  userId: Type.Optional(Type.String())
});
export type AuditLogQueryDTO = Static<typeof AuditLogQuerySchema>;

// System Cleanup DTO
export const SystemCleanupSchema = Type.Object({
  olderThanDays: Type.Optional(Type.Integer({ minimum: 1, default: 30 }))
});
export type SystemCleanupDTO = Static<typeof SystemCleanupSchema>;

// Admin User Chat History Query
export const AdminUserChatHistoryQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  sessionId: Type.Optional(Type.String())
});
export type AdminUserChatHistoryQueryDTO = Static<typeof AdminUserChatHistoryQuerySchema>;

// Analytics Query Schema
export const AnalyticsQuerySchema = Type.Object({
  period: Type.Optional(
    Type.Union(
      [
        Type.Literal('daily'),
        Type.Literal('weekly'),
        Type.Literal('monthly'),
        Type.Literal('custom'),
        Type.Literal('all')
      ],
      { default: 'daily' }
    )
  ),
  // RFC3339/ISO date strings — unvalidated strings previously reached Postgres
  // casts and surfaced as 500s on garbage input.
  startDate: Type.Optional(
    Type.String({ pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}([T ][0-9:.]+(Z|[+-][0-9]{2}:?[0-9]{2})?)?$' })
  ),
  endDate: Type.Optional(
    Type.String({ pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}([T ][0-9:.]+(Z|[+-][0-9]{2}:?[0-9]{2})?)?$' })
  )
});
export type AnalyticsQueryDTO = Static<typeof AnalyticsQuerySchema>;

// Control Worker Schema
export const ControlWorkerSchema = Type.Object({
  action: Type.Union([
    Type.Literal('start'),
    Type.Literal('pause'),
    Type.Literal('stop'),
    Type.Literal('restart')
  ])
});
export type ControlWorkerDTO = Static<typeof ControlWorkerSchema>;

// Save Symbol Schema
export const SaveSymbolSchema = Type.Object({
  symbol: Type.String({ minLength: 2, maxLength: 50 }),
  description: Type.Optional(Type.String({ maxLength: 255 })),
  category: Type.Optional(Type.String({ default: 'forex' })),
  finnhubSymbol: Type.Optional(Type.String({ maxLength: 100 })),
  dukascopySymbol: Type.Optional(Type.String({ maxLength: 100 })),
  isActive: Type.Optional(Type.Boolean({ default: true }))
});
export type SaveSymbolDTO = Static<typeof SaveSymbolSchema>;

// Save Stream Symbol Schema
export const SaveStreamSymbolSchema = Type.Object({
  symbol: Type.String({ minLength: 2, maxLength: 50 }),
  finnhubSymbol: Type.String({ minLength: 2, maxLength: 100 }),
  description: Type.Optional(Type.String({ maxLength: 255 })),
  category: Type.Optional(Type.String({ default: 'forex' })),
  isActive: Type.Optional(Type.Boolean({ default: true }))
});
export type SaveStreamSymbolDTO = Static<typeof SaveStreamSymbolSchema>;

// Save OHLC Symbol Schema
export const SaveOhlcSymbolSchema = Type.Object({
  symbol: Type.String({ minLength: 2, maxLength: 50 }),
  dukascopySymbol: Type.String({ minLength: 2, maxLength: 100 }),
  description: Type.Optional(Type.String({ maxLength: 255 })),
  isActive: Type.Optional(Type.Boolean({ default: true }))
});
export type SaveOhlcSymbolDTO = Static<typeof SaveOhlcSymbolSchema>;
