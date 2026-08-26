-- T5.0b — Reservation sweeper: releases stuck reserved_credits.
-- Runs periodically (piggyback on cleanup-worker hourly tick) to release
-- holds that were never settled (crash / network partition).

-- Release reservations older than 30 minutes that have no matching settlement:
UPDATE identity.users
SET reserved_credits = GREATEST(0, reserved_credits - 1),
    reserved_until = NULL
WHERE reserved_credits > 0
  AND reserved_until IS NOT NULL
  AND reserved_until < NOW() - INTERVAL '30 minutes';

-- Add reserved_until column if it doesn't exist yet:
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMPTZ;
