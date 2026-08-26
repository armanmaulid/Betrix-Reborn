import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index
} from 'drizzle-orm/pg-core';
import { users } from './identity.schema.js';

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

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    sessionId: varchar('session_id', { length: 255 }).notNull(),
    taskType: varchar('task_type', { length: 100 }).notNull(),
    modelUsed: varchar('model_used', { length: 100 }).notNull(),
    message: text('message').notNull(),
    reply: text('reply').notNull(),
    latencyMs: integer('latency_ms').default(0).notNull(),
    inputTokens: integer('input_tokens').default(0).notNull(),
    outputTokens: integer('output_tokens').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index('chat_messages_user_created_idx').on(t.userId, t.createdAt),
    index('chat_messages_session_user_idx').on(t.sessionId, t.userId),
    index('chat_messages_created_idx').on(t.createdAt)
  ]
);
