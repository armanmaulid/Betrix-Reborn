-- T0.2 — Table size + row-count baseline (Fase 0)
-- Run against the APP database with the app role. Save output to
-- docs/ops/baseline-sizes.txt equivalent (or paste into the plan ticket).

SELECT
  c.relname                          AS table_name,
  pg_size_pretty(pg_total_relation_size(c.oid))        AS total_size,
  pg_size_pretty(pg_relation_size(c.oid))              AS heap_size,
  pg_size_pretty(pg_indexes_size(c.oid))               AS index_size,
  COALESCE(s.n_live_tup, 0)          AS est_rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
WHERE c.relkind = 'r'
  AND n.nspname = 'public'
ORDER BY pg_total_relation_size(c.oid) DESC;

-- Index inventory snapshot (pairs with plan §C.1 gap list):
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
