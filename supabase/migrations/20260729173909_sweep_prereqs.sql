-- Prerequisites for the real sweep cron (docs/ARCHITECTURE.md section 5's
-- POST /api/cron/sweep). Two real gaps found while building it, both required
-- before "advances stalled meetings" means anything:
--
-- 1. meetings.updated_at never changed after insert -- meetings_active_idx
--    (status, updated_at) already existed for exactly this staleness query, but
--    nothing populated the column on UPDATE.
-- 2. increment_usage_daily derived the user from auth.uid() only. A cron job
--    authenticates with CRON_SECRET, not a user session, so auth.uid() is null
--    there -- the RPC needs an explicit fallback for that one caller.

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger meetings_set_updated_at
  before update on meetings
  for each row
  execute function set_updated_at();

-- Changed parameter list = a new overload, not a replacement (Postgres
-- identifies functions by name + parameter types) -- learned the hard way in
-- the M3-slice-1 migration. Drop first, then create, in the same migration.
drop function if exists increment_usage_daily(date, integer, integer, integer, integer, integer, integer);

create function increment_usage_daily(
  p_day date,
  p_audio_seconds integer,
  p_asr_calls integer,
  p_llm_calls integer default 0,
  p_llm_tokens integer default 0,
  p_ask_calls integer default 0,
  p_ask_tokens integer default 0,
  p_user_id uuid default null
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into usage_daily (user_id, day, audio_seconds, asr_calls, llm_calls, llm_tokens, ask_calls, ask_tokens)
  values (coalesce(auth.uid(), p_user_id), p_day, p_audio_seconds, p_asr_calls, p_llm_calls, p_llm_tokens, p_ask_calls, p_ask_tokens)
  on conflict (user_id, day) do update
  set audio_seconds = usage_daily.audio_seconds + excluded.audio_seconds,
      asr_calls      = usage_daily.asr_calls + excluded.asr_calls,
      llm_calls      = usage_daily.llm_calls + excluded.llm_calls,
      llm_tokens     = usage_daily.llm_tokens + excluded.llm_tokens,
      ask_calls      = usage_daily.ask_calls + excluded.ask_calls,
      ask_tokens     = usage_daily.ask_tokens + excluded.ask_tokens;
end;
$$;

grant execute on function increment_usage_daily(date, integer, integer, integer, integer, integer, integer, uuid) to authenticated, service_role;
