import { pgSchema, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * D1 Phase 0 — Better Auth schema namespace.
 *
 * Better Auth owns 4 core tables (`user`, `session`, `account`, `verification`)
 * whose column names are part of BA's API contract. We place them in a NEW
 * Postgres schema namespace called `auth` so they coexist with the legacy
 * `identity.users` / `identity.sessions` tables during the parallel-run window.
 *
 * Phase 2 cutover (per docs/D1-better-auth-migration-plan.md §4.3):
 *   - `account.password` is backfilled from `identity.users.password_hash`
 *     (bcryptjs cost 12, preserved via BA `password.hash` override).
 *   - Legacy `identity.sessions` rows are invalidated at cutover.
 *   - `users` will be extended in-place with `updatedAt`/`image` columns.
 *
 * UUID PKs (`generateId: 'uuid'` will be set in `better-auth.ts`) keep FK
 * compatibility with the existing `identity.users.id` and downstream
 * `money.*` tables that reference user IDs.
 */
export const authSchema = pgSchema('auth');

export const user = authSchema.table('user', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const session = authSchema.table(
  'session',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: uuid('user_id')
      .references(() => user.id, { onDelete: 'cascade' })
      .notNull()
  },
  (t) => [
    index('session_user_id_idx').on(t.userId),
    index('session_expires_at_idx').on(t.expiresAt)
  ]
);

export const account = authSchema.table(
  'account',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: uuid('user_id')
      .references(() => user.id, { onDelete: 'cascade' })
      .notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index('account_user_id_idx').on(t.userId),
    index('account_provider_account_idx').on(t.providerId, t.accountId)
  ]
);

export const verification = authSchema.table(
  'verification',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index('verification_identifier_idx').on(t.identifier),
    index('verification_expires_at_idx').on(t.expiresAt)
  ]
);

// Relations — BA's drizzleAdapter walks these to resolve hasMany joins.
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account)
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] })
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] })
}));
