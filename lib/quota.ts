// Free-tier accounting (docs/ARCHITECTURE.md section 8). Deliberately kept at this
// path rather than server/config/ -- CLAUDE.md (the user's own project instructions,
// which take precedence over the server/ convention locked mid-project) already
// names "lib/quota.ts" directly. It is server-only despite living in lib/: it reads
// server-only env ceilings and writes usage_daily with the caller's own Supabase
// client. Never import this from a "use client" file.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/models/database.types";

const DAILY_AUDIO_SECONDS = Number(process.env.GROQ_DAILY_AUDIO_SECONDS ?? 28800);
const DAILY_ASR_CALLS = Number(process.env.GROQ_DAILY_ASR_CALLS ?? 2000);
const DAILY_LLM_CALLS = Number(process.env.GROQ_DAILY_LLM_CALLS ?? 1000);
const DAILY_LLM_TOKENS = Number(process.env.GROQ_DAILY_LLM_TOKENS ?? 100000);
const DAILY_ASK_CALLS = Number(process.env.GROQ_DAILY_ASK_CALLS ?? 14400);
const DAILY_ASK_TOKENS = Number(process.env.GROQ_DAILY_ASK_TOKENS ?? 500000);

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextUtcMidnight(): string {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return midnight.toISOString();
}

export type QuotaCheck = { ok: true } | { ok: false; resumeAt: string };

/** Checks projected spend against today's ceiling before the upstream call, so a
 *  heavy day produces the designed quota_blocked state rather than a raw Groq 429.
 *  Does not itself reserve/increment -- call recordUsage after the call succeeds. */
export async function checkAndReserve(
  supabase: SupabaseClient<Database>,
  userId: string,
  projected: { audioSeconds?: number; llmTokens?: number; askTokens?: number },
): Promise<QuotaCheck> {
  const { data, error } = await supabase
    .from("usage_daily")
    .select("audio_seconds, asr_calls, llm_calls, llm_tokens, ask_calls, ask_tokens")
    .eq("user_id", userId)
    .eq("day", todayUtc())
    .maybeSingle();
  if (error) throw error;

  const audioSeconds = (data?.audio_seconds ?? 0) + (projected.audioSeconds ?? 0);
  const asrCalls = (data?.asr_calls ?? 0) + (projected.audioSeconds !== undefined ? 1 : 0);
  const llmCalls = (data?.llm_calls ?? 0) + (projected.llmTokens !== undefined ? 1 : 0);
  const llmTokens = (data?.llm_tokens ?? 0) + (projected.llmTokens ?? 0);
  const askCalls = (data?.ask_calls ?? 0) + (projected.askTokens !== undefined ? 1 : 0);
  const askTokens = (data?.ask_tokens ?? 0) + (projected.askTokens ?? 0);

  if (
    audioSeconds > DAILY_AUDIO_SECONDS ||
    asrCalls > DAILY_ASR_CALLS ||
    llmCalls > DAILY_LLM_CALLS ||
    llmTokens > DAILY_LLM_TOKENS ||
    askCalls > DAILY_ASK_CALLS ||
    askTokens > DAILY_ASK_TOKENS
  ) {
    return { ok: false, resumeAt: nextUtcMidnight() };
  }
  return { ok: true };
}

/** Atomic upsert -- docs/AI-PIPELINE.md section 7's exact shape, so two concurrent
 *  calls for the same user/day both land instead of one clobbering the other. The
 *  Postgres function derives the user from auth.uid() itself (supabase/migrations/
 *  ..._quota_increment_function.sql) rather than trusting a passed-in id, so a caller
 *  can never inflate or reset someone else's quota. */
export async function recordUsage(
  supabase: SupabaseClient<Database>,
  usage: { audioSeconds?: number; llmTokens?: number; askTokens?: number },
): Promise<void> {
  const { error } = await supabase.rpc("increment_usage_daily", {
    p_day: todayUtc(),
    p_audio_seconds: usage.audioSeconds ?? 0,
    p_asr_calls: usage.audioSeconds !== undefined ? 1 : 0,
    p_llm_calls: usage.llmTokens !== undefined ? 1 : 0,
    p_llm_tokens: usage.llmTokens ?? 0,
    p_ask_calls: usage.askTokens !== undefined ? 1 : 0,
    p_ask_tokens: usage.askTokens ?? 0,
  });
  if (error) throw error;
}
