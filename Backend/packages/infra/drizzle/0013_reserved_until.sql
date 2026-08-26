-- T5.0b — reserved_until column (companion to schema separation in 0012).
-- Qualified + IF NOT EXISTS so the migration is safe to re-run.
ALTER TABLE "identity"."users" ADD COLUMN IF NOT EXISTS "reserved_until" TIMESTAMPTZ;
