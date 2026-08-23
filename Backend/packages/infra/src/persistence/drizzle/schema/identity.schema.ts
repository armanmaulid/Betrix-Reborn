import { pgTable, uuid, varchar, text, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
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
  googleId: varchar('google_id', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  birthdate: varchar('birthdate', { length: 50 }),
  gender: varchar('gender', { length: 20 }),
  bio: text('bio'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  lastActive: timestamp('last_active', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: varchar('token', { length: 512 }).notNull().unique(),
  deviceFingerprint: varchar('device_fingerprint', { length: 255 }).notNull(),
  ip: varchar('ip', { length: 100 }),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const devices = pgTable('devices', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  fingerprint: varchar('fingerprint', { length: 255 }).notNull().unique(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const failedLoginAttempts = pgTable('failed_login_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  ip: varchar('ip', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  index('failed_login_email_created_idx').on(t.email, t.createdAt)
]);

export const verificationTokens = pgTable('verification_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  type: varchar('type', { length: 50 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const notificationPreferences = pgTable('notification_preferences', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).primaryKey(),
  emailNotifications: boolean('email_notifications').default(true).notNull(),
  pushNotifications: boolean('push_notifications').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});
