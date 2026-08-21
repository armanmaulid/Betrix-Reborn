import { pgTable, uuid, varchar, text, boolean, integer, timestamp, bigint, jsonb, index } from 'drizzle-orm/pg-core';

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

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  taskType: varchar('task_type', { length: 100 }).notNull(),
  modelUsed: varchar('model_used', { length: 100 }).notNull(),
  message: text('message').notNull(),
  reply: text('reply').notNull(),
  latencyMs: integer('latency_ms').default(0).notNull(),
  inputTokens: integer('input_tokens').default(0).notNull(),
  outputTokens: integer('output_tokens').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  index('chat_messages_user_created_idx').on(t.userId, t.createdAt),
  index('chat_messages_session_user_idx').on(t.sessionId, t.userId)
]);

export const aiAgents = pgTable('ai_agents', {
  id: varchar('id', { length: 100 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  modelName: varchar('model_name', { length: 255 }).notNull(),
  baseUrl: varchar('base_url', { length: 500 }),
  apiKey: text('api_key'),
  taskType: varchar('task_type', { length: 100 }).notNull().default('trade_reasoning'),
  systemPrompt: text('system_prompt'),
  tier: varchar('tier', { length: 50 }).notNull().default('deep'),
  creditsPer1kTokens: integer('credits_per_1k_tokens').notNull().default(1),
  maxTokens: integer('max_tokens').notNull().default(8192),
  temperature: integer('temperature').notNull().default(70),
  supportsThinking: boolean('supports_thinking').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  visibility: varchar('visibility', { length: 20 }).notNull().default('public'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const creditTransactions = pgTable('credit_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  amount: integer('amount').notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const symbols = pgTable('symbols', {
  symbol: varchar('symbol', { length: 50 }).primaryKey(),
  description: text('description'),
  path: varchar('path', { length: 255 }),
  category: varchar('category', { length: 100 }).notNull(),
  finnhubSymbol: varchar('finnhub_symbol', { length: 100 }),
  dukascopySymbol: varchar('dukascopy_symbol', { length: 100 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const streamSymbols = pgTable('stream_symbols', {
  symbol: varchar('symbol', { length: 50 }).primaryKey(),
  finnhubSymbol: varchar('finnhub_symbol', { length: 100 }).notNull().unique(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const ohlcSymbols = pgTable('ohlc_symbols', {
  symbol: varchar('symbol', { length: 50 }).primaryKey().references(() => symbols.symbol, { onDelete: 'cascade' }),
  dukascopySymbol: varchar('dukascopy_symbol', { length: 100 }).notNull().unique(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const newsArticles = pgTable('news_articles', {
  id: varchar('id', { length: 255 }).primaryKey(),
  source: varchar('source', { length: 255 }).notNull(),
  headline: text('headline').notNull(),
  url: text('url').notNull(),
  summary: text('summary').notNull(),
  datetime: bigint('datetime', { mode: 'number' }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  tags: text('tags').array(),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  index('news_articles_datetime_idx').on(t.datetime),
  index('news_articles_category_datetime_idx').on(t.category, t.datetime)
]);

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  fromUserId: uuid('from_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  toUserId: uuid('to_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  body: text('body').notNull(),
  threadId: uuid('thread_id').notNull(),
  replyToMessageId: uuid('reply_to_message_id'),
  readAt: timestamp('read_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  index('messages_to_created_idx').on(t.toUserId, t.createdAt),
  index('messages_from_created_idx').on(t.fromUserId, t.createdAt),
  index('messages_thread_idx').on(t.threadId)
]);

export const notificationPreferences = pgTable('notification_preferences', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).primaryKey(),
  emailNotifications: boolean('email_notifications').default(true).notNull(),
  pushNotifications: boolean('push_notifications').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  details: jsonb('details'),
  ip: varchar('ip', { length: 100 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  index('activity_logs_user_created_idx').on(t.userId, t.createdAt)
]);

export const adminActions = pgTable('admin_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminId: uuid('admin_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  targetType: varchar('target_type', { length: 100 }).notNull(),
  targetId: varchar('target_id', { length: 255 }).notNull(),
  details: jsonb('details'),
  ip: varchar('ip', { length: 100 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  index('admin_actions_action_created_idx').on(t.action, t.createdAt)
]);

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

export const creditVouchers = pgTable('credit_vouchers', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 64 }).notNull().unique(),
  amount: integer('amount').notNull(),
  createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  isRedeemed: boolean('is_redeemed').default(false).notNull(),
  redeemedById: uuid('redeemed_by_id').references(() => users.id, { onDelete: 'set null' }),
  redeemedAt: timestamp('redeemed_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

