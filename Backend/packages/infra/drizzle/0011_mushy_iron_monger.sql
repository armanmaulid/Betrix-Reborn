CREATE TABLE "usage_daily" (
	"date" date NOT NULL,
	"agent_id" varchar(100) NOT NULL,
	"chats" integer DEFAULT 0 NOT NULL,
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "usage_daily_date_agent_id_pk" PRIMARY KEY("date","agent_id")
);
--> statement-breakpoint
CREATE INDEX "usage_daily_agent_idx" ON "usage_daily" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "devices_user_idx" ON "devices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "failed_login_created_idx" ON "failed_login_attempts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_google_id_unique" ON "users" USING btree ("google_id");--> statement-breakpoint
CREATE INDEX "users_tier_idx" ON "users" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_last_active_idx" ON "users" USING btree ("last_active");--> statement-breakpoint
CREATE INDEX "verification_tokens_user_type_idx" ON "verification_tokens" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "verification_tokens_expires_at_idx" ON "verification_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "credit_transactions_user_created_idx" ON "credit_transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_vouchers_is_redeemed_idx" ON "credit_vouchers" USING btree ("is_redeemed");--> statement-breakpoint
CREATE INDEX "credit_vouchers_created_at_idx" ON "credit_vouchers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "credit_vouchers_amount_idx" ON "credit_vouchers" USING btree ("amount");--> statement-breakpoint
CREATE INDEX "credit_vouchers_redeemed_at_idx" ON "credit_vouchers" USING btree ("redeemed_at");--> statement-breakpoint
CREATE INDEX "chat_messages_created_idx" ON "chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "news_articles_tags_gin_idx" ON "news_articles" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "admin_actions_target_idx" ON "admin_actions" USING btree ("target_id");