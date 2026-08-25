import { z } from 'zod';

/**
 * Identity-owned schemas for admin user management.
 * (Moved out of operations/admin.schema so the identity module owns its
 * own contract.)
 */

export const UserTierEnum = z.enum(['free', 'starter', 'pro', 'premium', 'vip']);

export const AdminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  search: z.string().optional(),
  tier: UserTierEnum.optional()
});
export type AdminUsersQueryInput = z.infer<typeof AdminUsersQuerySchema>;

export const UpdateAdminUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .optional(),
  isAdmin: z.boolean().optional(),
  status: z.enum(['active', 'suspended', 'banned']).optional(),
  tier: UserTierEnum.optional(),
  credits: z.coerce.number().int().min(0, 'Credits cannot be negative').optional()
});
export type UpdateAdminUserInput = z.infer<typeof UpdateAdminUserSchema>;

export const ResetUserPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
});
export type ResetUserPasswordInput = z.infer<typeof ResetUserPasswordSchema>;

export const CreateAdminUserSchema = z.object({
  email: z.string().email('Valid email is required').max(255),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .optional()
    .or(z.literal('')),
  credits: z.coerce.number().int().min(0, 'Credits cannot be negative').default(100),
  isAdmin: z.boolean().default(false),
  tier: UserTierEnum.default('free')
});
export type CreateAdminUserInput = z.input<typeof CreateAdminUserSchema>;
