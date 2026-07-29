-- M3 slice 3: "Ask this meeting" (docs/AI-PIPELINE.md section 6).
--
-- 1. usage_daily gets its own bucket for the Ask model (llama-3.1-8b-instant),
--    separate from the 70B analysis/email bucket -- section 7's table gives it a
--    much higher, distinct daily ceiling.
-- 2. increment_usage_daily grows to 7 params. Dropped and recreated in the same
--    migration this time, not CREATE OR REPLACE -- the M3-slice-1 migration
--    learned the hard way that a changed parameter list creates a second overload
--    rather than replacing the function.
-- 3. search_transcript_segments: Supabase-js's query builder can't express a
--    ts_rank_cd-ordered result directly, so retrieval needs a real function, same
--    class of gap as increment_usage_daily itself. security invoker so the
--    existing transcript_segments RLS policy (own rows only) still applies.

alter table usage_daily
  add column ask_calls integer not null default 0,
  add column ask_tokens integer not null default 0;

drop function if exists increment_usage_daily(date, integer, integer, integer, integer);

create function increment_usage_daily(
  p_day date,
  p_audio_seconds integer,
  p_asr_calls integer,
  p_llm_calls integer default 0,
  p_llm_tokens integer default 0,
  p_ask_calls integer default 0,
  p_ask_tokens integer default 0
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into usage_daily (user_id, day, audio_seconds, asr_calls, llm_calls, llm_tokens, ask_calls, ask_tokens)
  values (auth.uid(), p_day, p_audio_seconds, p_asr_calls, p_llm_calls, p_llm_tokens, p_ask_calls, p_ask_tokens)
  on conflict (user_id, day) do update
  set audio_seconds = usage_daily.audio_seconds + excluded.audio_seconds,
      asr_calls      = usage_daily.asr_calls + excluded.asr_calls,
      llm_calls      = usage_daily.llm_calls + excluded.llm_calls,
      llm_tokens     = usage_daily.llm_tokens + excluded.llm_tokens,
      ask_calls      = usage_daily.ask_calls + excluded.ask_calls,
      ask_tokens     = usage_daily.ask_tokens + excluded.ask_tokens;
end;
$$;

grant execute on function increment_usage_daily(date, integer, integer, integer, integer, integer, integer) to authenticated;

create function search_transcript_segments(
  p_meeting_id uuid,
  p_query text,
  p_limit integer default 25
) returns table (
  id bigint,
  seq integer,
  start_sec numeric,
  end_sec numeric,
  speaker text,
  text text,
  rank real
)
language sql
security invoker
set search_path = public
as $$
  select
    ts.id, ts.seq, ts.start_sec, ts.end_sec, ts.speaker, ts.text,
    ts_rank_cd(to_tsvector('english', ts.text), websearch_to_tsquery('english', p_query)) as rank
  from transcript_segments ts
  where ts.meeting_id = p_meeting_id
    and to_tsvector('english', ts.text) @@ websearch_to_tsquery('english', p_query)
  order by rank desc
  limit p_limit;
$$;

grant execute on function search_transcript_segments(uuid, text, integer) to authenticated;
