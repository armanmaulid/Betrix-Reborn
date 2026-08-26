-- T4.6 — Partial unique index: at most ONE default AI agent at any time.
-- This makes the application-level "demote others then promote this one"
-- logic unnecessary — the DATABASE enforces it.

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS ai_agents_one_default_idx
  ON trading.ai_agents ((1)) WHERE is_default = true;
