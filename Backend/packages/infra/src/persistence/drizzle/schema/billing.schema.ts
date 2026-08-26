import { pgTable, uuid, varchar, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './identity.schema.js';

export const creditTransactions = pgTable(
  'credit_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    amount: integer('amount').notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index('credit_transactions_user_created_idx').on(t.userId, t.createdAt)]
);

export const creditVouchers = pgTable(
  'credit_vouchers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 64 }).notNull().unique(),
    amount: integer('amount').notNull(),
    createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    isRedeemed: boolean('is_redeemed').default(false).notNull(),
    redeemedById: uuid('redeemed_by_id').references(() => users.id, { onDelete: 'set null' }),
    redeemedAt: timestamp('redeemed_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index('credit_vouchers_is_redeemed_idx').on(t.isRedeemed),
    index('credit_vouchers_created_at_idx').on(t.createdAt),
    index('credit_vouchers_amount_idx').on(t.amount),
    index('credit_vouchers_redeemed_at_idx').on(t.redeemedAt)
  ]
);
