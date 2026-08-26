-- T5.3 — Backup & DR runbook for the money schema

-- HOURLY BASE BACKUP (pg_dump):
-- pg_dump "$DATABASE_URL_MONEY" --schema=money --format=custom \
--   --file="money_$(date +%Y%m%d_%H%M%S).dump"

-- WAL ARCHIVING (postgresql.conf):
-- archive_mode = on
-- archive_command = 'test ! -f /archive/%f && cp %p /archive/%f'
-- archive_timeout = 300  -- flush every 5 min → RPO ≤ 5 minutes

-- RESTORE DRILL (quarterly):
-- 1. Create empty database: CREATE DATABASE money_restore;
-- 2. Restore: pg_restore -d money_restore money_YYYYMMDD_HHMMSS.dump
-- 3. Verify: SELECT SUM(amount) FROM money.credit_transactions WHERE ...
-- 4. Compare with production: SELECT SUM(credits) FROM identity.users;

-- RETENTION: keep 30 daily dumps + 12 monthly dumps + all WAL segments
-- since last monthly base backup.
