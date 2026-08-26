-- T1.2 — one-shot FULL-HISTORY backfill into usage_daily.
-- Run once BEFORE flipping USE_USAGE_DAILY=true on an existing database.
-- The rolling hourly upsert only refreshes the last 3 days; this fills all
-- prior history so analytics parity covers old data too.

insert into usage_daily (date, agent_id, chats, input_tokens, output_tokens)
select
  to_char(date_trunc('day', created_at at time zone 'utc'), 'YYYY-MM-DD')::date,
  model_used,
  count(*),
  sum(input_tokens),
  sum(output_tokens)
from chat_messages
group by 1, 2
on conflict (date, agent_id) do update set
  chats = excluded.chats,
  input_tokens = excluded.input_tokens,
  output_tokens = excluded.output_tokens;

-- Parity check (must return 0 rows):
--   with m as (
--     select date_trunc('day', created_at at time zone 'utc') d, model_used a,
--            sum(input_tokens + output_tokens) t
--     from chat_messages group by 1, 2)
--   select coalesce(m.d::text,'') d, coalesce(m.a,'') a, m.t, coalesce(u.input_tokens+u.output_tokens,0) u
--   from m full outer join usage_daily u on u.date=m.d::date and u.agent_id=m.a
--   where coalesce(m.t,-1) <> coalesce(u.input_tokens+u.output_tokens,-1);
