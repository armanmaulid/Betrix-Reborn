-- T1.1 — Fase 1 index pass for EXISTING databases.
--
-- ⚠️ CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
--    Execute with psql in autocommit mode:
--      psql "$DATABASE_URL" -f scripts/ops/003_phase1_indexes.sql
--    Fresh deployments get these automatically via drizzle migration 0011+.
--
-- Every statement is IF NOT EXISTS → safe to re-run.

-- 🔐 money ledger (K1 — highest priority)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS users_google_id_unique ON users (google_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS credit_transactions_user_created_idx
  ON credit_transactions (user_id, created_at);

-- identity hot paths
CREATE INDEX CONCURRENTLY IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS devices_user_idx ON devices (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS verification_tokens_user_type_idx
  ON verification_tokens (user_id, type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS verification_tokens_expires_at_idx
  ON verification_tokens (expires_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS failed_login_created_idx
  ON failed_login_attempts (created_at);

-- admin list / analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_tier_idx ON users (tier);
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_created_at_idx ON users (created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_last_active_idx ON users (last_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS admin_actions_target_idx ON admin_actions (target_id);

-- vouchers (admin filter/sort set)
CREATE INDEX CONCURRENTLY IF NOT EXISTS credit_vouchers_is_redeemed_idx ON credit_vouchers (is_redeemed);
CREATE INDEX CONCURRENTLY IF NOT EXISTS credit_vouchers_created_at_idx ON credit_vouchers (created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS credit_vouchers_amount_idx ON credit_vouchers (amount);
CREATE INDEX CONCURRENTLY IF NOT EXISTS credit_vouchers_redeemed_at_idx ON credit_vouchers (redeemed_at);

-- chat analytics range scans (T1.2 rollup source)
CREATE INDEX CONCURRENTLY IF NOT EXISTS chat_messages_created_idx ON chat_messages (created_at);

-- news tag filtering (arrayContains)
CREATE INDEX CONCURRENTLY IF NOT EXISTS news_articles_tags_gin_idx
  ON news_articles USING gin (tags);

-- Optional (requires: CREATE EXTENSION IF NOT EXISTS pg_trgm;) — only if the
-- headline/summary search stays on PG at volume:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS news_headline_trgm_idx
--   ON news_articles USING gin (headline gin_trgm_ops);
