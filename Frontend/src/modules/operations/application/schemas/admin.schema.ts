import { z } from 'zod';

/**
 * Operations-owned schemas. User-management schemas live in
 * identity/application/schemas/admin-user.schema.ts and the voucher schema in
 * billing/application/schemas/voucher.schema.ts — each module owns its own.
 */

export const BroadcastMessageSchema = z.object({
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(255, 'Subject cannot exceed 255 characters'),
  body: z
    .string()
    .min(1, 'Message body is required')
    .max(5000, 'Message body cannot exceed 5000 characters'),
  targetUserIds: z.array(z.string()).optional()
});
export type BroadcastMessageInput = z.infer<typeof BroadcastMessageSchema>;

export const AuditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
  actionType: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().optional()
});
export type AuditLogQueryInput = z.infer<typeof AuditLogQuerySchema>;

export const SystemCleanupSchema = z.object({
  olderThanDays: z.coerce.number().int().min(1, 'Must be at least 1 day').default(30)
});
export type SystemCleanupInput = z.infer<typeof SystemCleanupSchema>;
