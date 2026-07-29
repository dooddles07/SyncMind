-- Extends increment_usage_daily to also track LLM usage (analysis calls), not just
-- transcription. New params are trailing with defaults, so the existing
-- transcription call site (server/controllers/pipeline-controller.ts) keeps working
-- unchanged -- Postgres allows CREATE OR REPLACE to append defaulted parameters
-- without breaking existing call sites.
create or replace function increment_usage_daily(
  p_day date,
  p_audio_seconds integer,
  p_asr_calls integer,
  p_llm_calls integer default 0,
  p_llm_tokens integer default 0
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into usage_daily (user_id, day, audio_seconds, asr_calls, llm_calls, llm_tokens)
  values (auth.uid(), p_day, p_audio_seconds, p_asr_calls, p_llm_calls, p_llm_tokens)
  on conflict (user_id, day) do update
  set audio_seconds = usage_daily.audio_seconds + excluded.audio_seconds,
      asr_calls      = usage_daily.asr_calls + excluded.asr_calls,
      llm_calls      = usage_daily.llm_calls + excluded.llm_calls,
      llm_tokens     = usage_daily.llm_tokens + excluded.llm_tokens;
end;
$$;

grant execute on function increment_usage_daily(date, integer, integer, integer, integer) to authenticated;
