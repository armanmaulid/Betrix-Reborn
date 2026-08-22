import { z } from 'zod';

export const UserTierEnum = z.enum(['free', 'starter', 'pro', 'premium', 'vip']);

export const AdminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  search: z.string().optional(),
  tier: UserTierEnum.optional()
});
export type AdminUsersQueryInput = z.infer<typeof AdminUsersQuerySchema>;

export const UpdateAdminUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters').optional(),
  isAdmin: z.boolean().optional(),
  status: z.enum(['active', 'suspended', 'banned']).optional(),
  tier: UserTierEnum.optional(),
  credits: z.coerce.number().int().min(0, 'Credits cannot be negative').optional()
});
export type UpdateAdminUserInput = z.infer<typeof UpdateAdminUserSchema>;

export const ResetUserPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password cannot exceed 128 characters')
});
export type ResetUserPasswordInput = z.infer<typeof ResetUserPasswordSchema>;

export const CreateAdminUserSchema = z.object({
  email: z.string().email('Valid email is required').max(255),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password cannot exceed 128 characters').optional().or(z.literal('')),
  credits: z.coerce.number().int().min(0, 'Credits cannot be negative').default(100),
  isAdmin: z.boolean().default(false),
  tier: UserTierEnum.default('free')
});
export type CreateAdminUserInput = z.input<typeof CreateAdminUserSchema>;

export const CreateVoucherSchema = z.object({
  code: z.string().min(4, 'Code must be at least 4 characters').max(64, 'Code cannot exceed 64 characters').optional().or(z.literal('')),
  amount: z.coerce.number().int().min(1, 'Amount must be at least 1 credit').max(1000000, 'Amount cannot exceed 1,000,000 credits'),
  expiresAt: z.string().optional().or(z.literal(''))
});
export type CreateVoucherInput = z.infer<typeof CreateVoucherSchema>;

export const BroadcastMessageSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject cannot exceed 255 characters'),
  body: z.string().min(1, 'Message body is required').max(5000, 'Message body cannot exceed 5000 characters'),
  targetUserIds: z.array(z.string()).optional()
});
export type BroadcastMessageInput = z.infer<typeof BroadcastMessageSchema>;

export const AuditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
  actionType: z.string().optional(),
  action: z.string().optional()
});
export type AuditLogQueryInput = z.infer<typeof AuditLogQuerySchema>;

export const SystemCleanupSchema = z.object({
  olderThanDays: z.coerce.number().int().min(1, 'Must be at least 1 day').default(30)
});
export type SystemCleanupInput = z.infer<typeof SystemCleanupSchema>;
