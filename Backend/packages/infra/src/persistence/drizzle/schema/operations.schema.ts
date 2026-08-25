import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
  integer
} from 'drizzle-orm/pg-core';
import { users } from './identity.schema.js';

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fromUserId: uuid('from_user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    toUserId: uuid('to_user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    subject: varchar('subject', { length: 255 }).notNull(),
    body: text('body').notNull(),
    threadId: uuid('thread_id').notNull(),
    replyToMessageId: uuid('reply_to_message_id'),
    readAt: timestamp('read_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index('messages_to_created_idx').on(t.toUserId, t.createdAt),
    index('messages_from_created_idx').on(t.fromUserId, t.createdAt),
    index('messages_thread_idx').on(t.threadId)
  ]
);

export const activityLogs = pgTable(
  'activity_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    details: jsonb('details'),
    ip: varchar('ip', { length: 100 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index('activity_logs_user_created_idx').on(t.userId, t.createdAt)]
);

export const adminActions = pgTable(
  'admin_actions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adminId: uuid('admin_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    targetType: varchar('target_type', { length: 100 }).notNull(),
    targetId: varchar('target_id', { length: 255 }).notNull(),
    details: jsonb('details'),
    ip: varchar('ip', { length: 100 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index('admin_actions_action_created_idx').on(t.action, t.createdAt)]
);

/**
 * SSOT for background worker lifecycle status, read by `apps/worker` on boot
 * (so a worker paused/stopped by an admin does not silently auto-start again
 * after a process restart) and written by `apps/api` (on command) and
 * `apps/worker` (on health report). Redis pub/sub is only the real-time
 * transport between the two processes — this table is the source of truth.
 */
export const workerStates = pgTable('worker_states', {
  workerId: varchar('worker_id', { length: 100 }).primaryKey(),
  status: varchar('status', { length: 20 }).notNull().default('running'),
  lastCommand: varchar('last_command', { length: 20 }),
  lastCommandAt: timestamp('last_command_at', { withTimezone: true }),
  lastCommandBy: uuid('last_command_by').references(() => users.id, { onDelete: 'set null' }),
  lastReportAt: timestamp('last_report_at', { withTimezone: true }),
  processedCount: integer('processed_count').notNull().default(0),
  errorCount: integer('error_count').notNull().default(0),
  lastError: text('last_error'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});
