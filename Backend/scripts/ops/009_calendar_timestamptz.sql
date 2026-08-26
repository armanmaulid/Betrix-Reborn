-- T4.6 — Calendar datetime columns varchar(40) → timestamptz
-- Safe conversion pattern: add new column, backfill with cast, drop old.
-- announcement_datetime_utc stores ISO strings like '2026-01-08T13:30:00.000Z'

ALTER TABLE "content"."calendar_events"
  ADD COLUMN IF NOT EXISTS announcement_utc_ts timestamptz;

UPDATE "content"."calendar_events"
SET announcement_utc_ts = announcement_datetime_utc::timestamptz
WHERE announcement_datetime_utc IS NOT NULL;

ALTER TABLE "content"."calendar_events"
  ALTER COLUMN announcement_utc_ts SET NOT NULL;

ALTER TABLE "content"."calendar_events"
  RENAME COLUMN announcement_datetime_utc TO announcement_datetime_utc_legacy;
ALTER TABLE "content"."calendar_events"
  RENAME COLUMN announcement_utc_ts TO announcement_datetime_utc;
ALTER TABLE "content"."calendar_events"
  DROP COLUMN IF EXISTS announcement_datetime_utc_legacy;
