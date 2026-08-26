-- T0.1 — Enable pg_stat_statements (Fase 0 baseline)
-- Run ONCE per PostgreSQL instance, as superuser / rds_superuser.
--
-- 1) The library MUST be preloaded at server start. On managed providers
--    (Railway/Neon/RDS) set the instance parameter:
--        shared_preload_libraries = 'pg_stat_statements'
--    then restart the instance before running this file.
--
-- 2) Create the extension in the DATABASE WHERE QUERIES RUN (app DB):
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 3) Baseline top-10 by total execution time (save this output!):
SELECT
  calls,
  round(mean_exec_time::numeric, 2)          AS avg_ms,
  round(total_exec_time::numeric, 0)         AS total_ms,
  rows,
  left(query, 120)                           AS query_head
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Reset stats after capturing the baseline so post-migration comparisons
-- measure ONLY new activity:
--   SELECT pg_stat_statements_reset();
