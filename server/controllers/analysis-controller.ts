// Real analysis pass -- minutes + action items, single-pass only
// (docs/AI-PIPELINE.md section 3). Map-reduce and the Gemini fallback are
// deliberately deferred; see the M3 slice 1 plan for why. Nothing here is a new
// design decision -- prompts, schema, and clamps are all copied verbatim from
// the doc.
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkAndReserve, recordUsage } from "@/lib/quota";
import { AnalysisSchema, type Analysis } from "@/server/config/analysis-schema";
import type { Database } from "@/server/models/database.types";
import type { MeetingRow } from "@/server/models/meeting-model";
import { insertActionItems, type ActionItemInsert } from "@/server/models/action-item-model";
import { upsertSummary } from "@/server/models/summary-model";
import { applySpeakerRanges, getSegmentsForMeeting } from "@/server/models/transcript-model";
import { formatTimestamp } from "@/server/utils/format-timestamp";
import { QuotaBlockedError } from "@/server/utils/pipeline-errors";
import { runStructuredAndValidate } from "@/server/utils/structured-output";
import { isNearDuplicate } from "@/server/utils/text-similarity";

const ANALYSIS_MODEL = "llama-3.3-70b-versatile";
const SINGLE_PASS_SAFE_TOKENS = 5000;
const CHARS_PER_TOKEN = 4;
const ESTIMATED_OUTPUT_TOKENS = 2500;

export class AnalysisTooLongError extends Error {}

/** Minimal shape `runAnalysisModel` needs from a transcript segment -- lets
 *  callers without a DB row (the eval script) pass plain objects instead of
 *  a full `TranscriptSegmentRow`. */
export type AnalysisSegmentInput = { speaker: string | null; start_sec: number; text: string };

export type AnalysisMeetingInput = { title: string; meeting_date: string; duration_sec: number };

const SYSTEM_PROMPT = `You are an expert meeting analyst. You produce accurate, structured minutes from
meeting transcripts. You are precise and conservative: you record only what was
actually said.

RULES
1. Never invent facts, names, dates, or commitments. If something is unclear,
   omit it or record it under openQuestions.
2. Every decision, action item, and topic must include atSec: the timestamp in
   seconds where it appears in the transcript.
3. An action item requires a concrete commitment to do something. "We should
   think about pricing" is not an action item. "Dan will send the pricing deck
   by Thursday" is.
4. Assign owner only when the transcript makes it clear who committed. Otherwise
   set owner to null. Do not guess.
5. Resolve relative dates against MEETING_DATE, supplied below, and output
   absolute ISO dates (YYYY-MM-DD). "Friday" means the next Friday on or after
   MEETING_DATE. If a date is vague ("soon", "next sprint"), set dueDate to null.
6. Infer speaker names only when someone is addressed or introduces themselves by
   name in the transcript. Otherwise keep the generic label.
7. Write in plain, direct language. No filler, no praise, no meta-commentary
   about the transcript.
8. Output ONLY a JSON object matching the schema. No markdown fences, no prose
   before or after.

SCHEMA (Groq's JSON mode does not enforce this itself -- match these exact keys):
{
  "overview": string (40-1500 chars, a paragraph summarizing the meeting),
  "attendees": [{ "speakerLabel": string, "name": string | null, "confidence": "stated" | "inferred" }],
  "topics": [{ "title": string, "points": string[], "atSec": number }],
  "decisions": [{ "text": string, "atSec": number }],
  "openQuestions": [{ "text": string, "atSec": number }],
  "actionItems": [{ "title": string, "detail": string | null, "owner": string | null, "dueDate": "YYYY-MM-DD" | null, "priority": "low" | "medium" | "high", "atSec": number }],
  "speakerRanges": [{ "fromSec": number, "toSec": number, "speakerLabel": string }] (optional)
}
Every array may be empty. speakerLabel values must match one of SPEAKER_LABELS_PRESENT below.`;

function formatDuration(durationSec: number): string {
  const h = Math.floor(durationSec / 3600);
  const m = Math.floor((durationSec % 3600) / 60);
  return `${h}h ${m}m`;
}

function serializeTranscript(segments: AnalysisSegmentInput[]): { text: string; speakerLabels: string[] } {
  const speakerLabels: string[] = [];
  const lines = segments.map((segment) => {
    const label = segment.speaker ?? "Speaker 1";
    if (!speakerLabels.includes(label)) speakerLabels.push(label);
    return `[${formatTimestamp(segment.start_sec)}] ${label}: ${segment.text}`;
  });
  return { text: lines.join("\n"), speakerLabels };
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function clamp(atSec: number, durationSec: number): number {
  return Math.min(atSec, durationSec);
}

function cleanActionItems(
  items: Analysis["actionItems"],
  meetingDate: string,
  durationSec: number,
): Analysis["actionItems"] {
  const kept: Analysis["actionItems"] = [];

  for (const item of items) {
    if (item.title.trim().length < 8) continue;

    const dueDate = item.dueDate && item.dueDate < meetingDate ? null : item.dueDate;
    const clamped = { ...item, dueDate, atSec: clamp(item.atSec, durationSec) };

    const duplicate = kept.find((existing) => isNearDuplicate(existing.title, clamped.title));
    if (duplicate) {
      duplicate.atSec = Math.min(duplicate.atSec, clamped.atSec);
      continue;
    }
    kept.push(clamped);
  }

  return kept;
}

function buildPrompt(
  meeting: AnalysisMeetingInput,
  segments: AnalysisSegmentInput[],
): { userPrompt: string; transcriptTokens: number } {
  const { text: transcript, speakerLabels } = serializeTranscript(segments);
  const transcriptTokens = estimateTokens(transcript);

  const userPrompt = `MEETING_TITLE: ${meeting.title}
MEETING_DATE: ${meeting.meeting_date}
DURATION: ${formatDuration(meeting.duration_sec)}
SPEAKER_LABELS_PRESENT: ${speakerLabels.join(", ")}

TRANSCRIPT:
${transcript}

Produce the JSON object described in the schema.`;

  return { userPrompt, transcriptTokens };
}

/** Projected total tokens for a quota check, before spending anything on the
 *  real LLM call. Also throws `AnalysisTooLongError` early if the transcript
 *  itself is already past the single-pass safe limit. */
export function estimateAnalysisTokens(
  meeting: AnalysisMeetingInput,
  segments: AnalysisSegmentInput[],
): { transcriptTokens: number; projectedTokens: number } {
  const { userPrompt, transcriptTokens } = buildPrompt(meeting, segments);
  if (transcriptTokens > SINGLE_PASS_SAFE_TOKENS) {
    throw new AnalysisTooLongError("This meeting is too long to analyze yet.");
  }
  const projectedTokens = estimateTokens(SYSTEM_PROMPT) + estimateTokens(userPrompt) + ESTIMATED_OUTPUT_TOKENS;
  return { transcriptTokens, projectedTokens };
}

/** Runs the real Groq analysis call and applies the same clamp/dedupe rules
 *  the live pipeline uses -- no DB, no quota, callable standalone (used by
 *  both `analyzeMeeting` below and `scripts/eval.ts`). */
export async function runAnalysisModel(
  meeting: AnalysisMeetingInput,
  segments: AnalysisSegmentInput[],
): Promise<{ analysis: Analysis; totalTokens: number }> {
  const { userPrompt, transcriptTokens } = buildPrompt(meeting, segments);
  if (transcriptTokens > SINGLE_PASS_SAFE_TOKENS) {
    throw new AnalysisTooLongError("This meeting is too long to analyze yet.");
  }

  const { result, totalTokens } = await runStructuredAndValidate(AnalysisSchema, SYSTEM_PROMPT, userPrompt, {
    temperature: 0.2,
  });

  const durationSec = meeting.duration_sec;
  const analysis: Analysis = {
    ...result,
    topics: result.topics.map((t) => ({ ...t, atSec: clamp(t.atSec, durationSec) })),
    decisions: result.decisions.map((d) => ({ ...d, atSec: clamp(d.atSec, durationSec) })),
    openQuestions: result.openQuestions.map((q) => ({ ...q, atSec: clamp(q.atSec, durationSec) })),
    actionItems: cleanActionItems(result.actionItems, meeting.meeting_date, durationSec),
  };

  return { analysis, totalTokens };
}

export async function analyzeMeeting(
  supabase: SupabaseClient<Database>,
  meeting: MeetingRow,
): Promise<void> {
  const segments = await getSegmentsForMeeting(supabase, meeting.id);

  const { projectedTokens } = estimateAnalysisTokens(meeting, segments);
  const quota = await checkAndReserve(supabase, meeting.user_id, { llmTokens: projectedTokens });
  if (!quota.ok) {
    throw new QuotaBlockedError(quota.resumeAt);
  }

  const { analysis, totalTokens } = await runAnalysisModel(meeting, segments);
  await recordUsage(supabase, { llmTokens: totalTokens }, meeting.user_id);

  await upsertSummary(supabase, {
    meeting_id: meeting.id,
    user_id: meeting.user_id,
    model: ANALYSIS_MODEL,
    overview: analysis.overview,
    attendees: analysis.attendees,
    topics: analysis.topics,
    decisions: analysis.decisions,
    open_questions: analysis.openQuestions,
  });

  if (analysis.actionItems.length > 0) {
    const inserts: ActionItemInsert[] = analysis.actionItems.map((item, index) => ({
      meeting_id: meeting.id,
      user_id: meeting.user_id,
      title: item.title,
      detail: item.detail,
      owner_name: item.owner,
      due_date: item.dueDate,
      priority: item.priority,
      source_sec: item.atSec,
      position: index,
      ai_generated: true,
    }));
    await insertActionItems(supabase, inserts);
  }

  if (analysis.speakerRanges && analysis.speakerRanges.length > 0) {
    await applySpeakerRanges(supabase, meeting.id, analysis.speakerRanges);
  }
}
