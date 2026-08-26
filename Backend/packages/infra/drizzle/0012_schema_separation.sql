-- T4.1 + T4.6d — Schema separation + CHECK constraints
-- Review: each ALTER moves one table; no data loss (metadata-only operation).
-- FK references auto-update because they're name-resolved within the same DB.

-- Schemas
CREATE SCHEMA IF NOT EXISTS "identity";
CREATE SCHEMA IF NOT EXISTS "money";
CREATE SCHEMA IF NOT EXISTS "trading";
CREATE SCHEMA IF NOT EXISTS "content";
CREATE SCHEMA IF NOT EXISTS "ops";

-- Identity
ALTER TABLE "users" SET SCHEMA "identity";
ALTER TABLE "sessions" SET SCHEMA "identity";
ALTER TABLE "devices" SET SCHEMA "identity";
ALTER TABLE "verification_tokens" SET SCHEMA "identity";
ALTER TABLE "notification_preferences" SET SCHEMA "identity";
ALTER TABLE "failed_login_attempts" SET SCHEMA "identity";

-- Money
ALTER TABLE "credit_transactions" SET SCHEMA "money";
ALTER TABLE "credit_vouchers" SET SCHEMA "money";

-- Trading
ALTER TABLE "symbols" SET SCHEMA "trading";
ALTER TABLE "stream_symbols" SET SCHEMA "trading";
ALTER TABLE "ohlc_symbols" SET SCHEMA "trading";
ALTER TABLE "ai_agents" SET SCHEMA "trading";

-- Content
ALTER TABLE "news_articles" SET SCHEMA "content";
ALTER TABLE "calendar_events" SET SCHEMA "content";
ALTER TABLE "chat_messages" SET SCHEMA "content";
ALTER TABLE "messages" SET SCHEMA "content";

-- Ops
ALTER TABLE "worker_states" SET SCHEMA "ops";
ALTER TABLE "admin_actions" SET SCHEMA "ops";
ALTER TABLE "activity_logs" SET SCHEMA "ops";
ALTER TABLE "usage_daily" SET SCHEMA "ops";

-- CHECK constraints (T4.6d subset — declarative integrity)
--> statement-breakpoint
ALTER TABLE "identity"."users" ADD CONSTRAINT "users_status_check"
  CHECK ("status" IN ('active','suspended','banned'));
--> statement-breakpoint
ALTER TABLE "content"."chat_messages" ADD CONSTRAINT "chat_tokens_nonneg_check"
  CHECK ("input_tokens" >= 0 AND "output_tokens" >= 0);
--> statement-breakpoint
ALTER TABLE "money"."credit_vouchers" ADD CONSTRAINT "voucher_amount_positive_check"
  CHECK ("amount" > 0);
