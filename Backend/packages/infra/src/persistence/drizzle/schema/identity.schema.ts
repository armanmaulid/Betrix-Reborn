import { sql } from 'drizzle-orm';
import {
  pgSchema,
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
  check
} from 'drizzle-orm/pg-core';
import { identity as identitySchema } from './schemas.js';

export const users = identitySchema.table(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }),
    name: varchar('name', { length: 255 }),
    isAdmin: boolean('is_admin').default(false).notNull(),
    status: varchar('status', { length: 50 }).default('active').notNull(),
    tier: varchar('tier', { length: 50 }).default('free').notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    credits: integer('credits').default(100).notNull(),
    reservedCredits: integer('reserved_credits').default(0).notNull(),
    // T5.0b — liveness marker for reserved holds so the sweeper
    // (scripts/ops/012) can release stuck holds after a crash/partition.
    reservedUntil: timestamp('reserved_until', { withTimezone: true }),
    googleId: varchar('google_id', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    address: text('address'),
    birthdate: varchar('birthdate', { length: 50 }),
    gender: varchar('gender', { length: 20 }),
    bio: text('bio'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    lastActive: timestamp('last_active', { withTimezone: true }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    uniqueIndex('users_google_id_unique').on(t.googleId),
    index('users_tier_idx').on(t.tier),
    index('users_created_at_idx').on(t.createdAt),
    index('users_last_active_idx').on(t.lastActive),
    check('users_status_check', sql`${t.status} IN ('active','suspended','banned')`)
  ]
);

export const sessions = identitySchema.table(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    token: varchar('token', { length: 512 }).notNull().unique(),
    deviceFingerprint: varchar('device_fingerprint', { length: 255 }).notNull(),
    ip: varchar('ip', { length: 100 }),
    userAgent: text('user_agent'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_expires_at_idx').on(t.expiresAt)]
);

export const devices = identitySchema.table(
  'devices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    fingerprint: varchar('fingerprint', { length: 255 }).notNull().unique(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index('devices_user_idx').on(t.userId)]
);

export const failedLoginAttempts = identitySchema.table(
  'failed_login_attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    ip: varchar('ip', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index('failed_login_email_created_idx').on(t.email, t.createdAt),
    index('failed_login_created_idx').on(t.createdAt)
  ]
);

export const verificationTokens = identitySchema.table(
  'verification_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    token: varchar('token', { length: 255 }).notNull().unique(),
    type: varchar('type', { length: 50 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index('verification_tokens_user_type_idx').on(t.userId, t.type),
    index('verification_tokens_expires_at_idx').on(t.expiresAt)
  ]
);

export const notificationPreferences = identitySchema.table('notification_preferences', {
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .primaryKey(),
  emailNotifications: boolean('email_notifications').default(true).notNull(),
  pushNotifications: boolean('push_notifications').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});
