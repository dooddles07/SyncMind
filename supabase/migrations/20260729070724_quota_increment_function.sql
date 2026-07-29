-- docs/AI-PIPELINE.md section 7's exact upsert shape, wrapped in a function so it's
-- atomic under concurrent calls (Supabase-js's .upsert() overwrites on conflict, it
-- can't express "add to the existing value").
--
-- security invoker (the default, stated explicitly) rather than security definer:
-- the row this writes (user_id = auth.uid()) is exactly what the existing "own rows"
-- RLS policy on usage_daily already allows the caller to write directly, so there is
-- no privilege to elevate. auth.uid() is read inside the function, never trusted from
-- a caller-supplied parameter, so nobody can inflate or reset another user's quota.
create function increment_usage_daily(
  p_day date,
  p_audio_seconds integer,
  p_asr_calls integer
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into usage_daily (user_id, day, audio_seconds, asr_calls)
  values (auth.uid(), p_day, p_audio_seconds, p_asr_calls)
  on conflict (user_id, day) do update
  set audio_seconds = usage_daily.audio_seconds + excluded.audio_seconds,
      asr_calls = usage_daily.asr_calls + excluded.asr_calls;
end;
$$;

grant execute on function increment_usage_daily(date, integer, integer) to authenticated;
