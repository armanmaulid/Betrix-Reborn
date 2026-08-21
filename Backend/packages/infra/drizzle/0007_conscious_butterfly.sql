CREATE INDEX "activity_logs_user_created_idx" ON "activity_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_actions_action_created_idx" ON "admin_actions" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "chat_messages_user_created_idx" ON "chat_messages" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_messages_session_user_idx" ON "chat_messages" USING btree ("session_id","user_id");--> statement-breakpoint
CREATE INDEX "failed_login_email_created_idx" ON "failed_login_attempts" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "messages_to_created_idx" ON "messages" USING btree ("to_user_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_from_created_idx" ON "messages" USING btree ("from_user_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_thread_idx" ON "messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "news_articles_datetime_idx" ON "news_articles" USING btree ("datetime");--> statement-breakpoint
CREATE INDEX "news_articles_category_datetime_idx" ON "news_articles" USING btree ("category","datetime");