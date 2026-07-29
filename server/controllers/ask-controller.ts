// Real "Ask this meeting" (docs/AI-PIPELINE.md section 6). Retrieval-shaped, no
// vector database: full transcript under the token budget, otherwise Postgres
// full-text rank (search_transcript_segments RPC) plus a ±1-segment expansion for
// reading context. Nothing here is a new design decision.
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkAndReserve, recordUsage } from "@/lib/quota";
import { AskSchema, type AskAnswer } from "@/server/config/ask-schema";
import { ASK_MODEL, runStructuredCompletion } from "@/server/config/groq";
import type { Database } from "@/server/models/database.types";
import { countAskQueriesToday, insertAskQuery, type AskQueryRow } from "@/server/models/ask-query-model";
import type { MeetingRow } from "@/server/models/meeting-model";
import {
  getSegmentsBySeq,
  getSegmentsForMeeting,
  type TranscriptSegmentRow,
} from "@/server/models/transcript-model";
import { formatTimestamp } from "@/server/utils/format-timestamp";
import { QuotaBlockedError } from "@/server/utils/pipeline-errors";
import { runStructuredAndValidate } from "@/server/utils/structured-output";

const CHARS_PER_TOKEN = 4;
const ESTIMATED_OUTPUT_TOKENS = 400;
const FULL_TRANSCRIPT_TOKEN_LIMIT = 12000;
const RETRIEVAL_LIMIT = 25;
const DAILY_QUESTIONS_PER_MEETING = 20;
const NOT_IN_TRANSCRIPT = "That does not appear in this meeting's transcript.";

export class AskLimitReachedError extends Error {}

const SYSTEM_PROMPT = `You answer questions about a single meeting using only the transcript excerpts
provided.

RULES
1. If the excerpts do not contain the answer, say exactly: "That does not appear
   in this meeting's transcript." Do not speculate.
2. Cite every claim with the timestamp in seconds from the excerpt you used.
3. Answer in at most 120 words unless the question requires a list.
4. Output ONLY JSON: { "answer": string, "citations": [{ "atSec": number }] }.

SCHEMA (Groq's JSON mode does not enforce this itself -- match these exact keys):
{ "answer": string, "citations": [{ "atSec": number }] }`;

const CITATION_REPAIR_SUFFIX = `\n\nYour previous answer did not cite any timestamp even though it was not the
"That does not appear in this meeting's transcript." response. Re-answer, citing
the timestamp in seconds for every claim.`;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function serializeSegments(segments: TranscriptSegmentRow[]): string {
  return segments.map((s) => `[${formatTimestamp(s.start_sec)}] ${s.text}`).join("\n");
}

async function retrieveContext(
  supabase: SupabaseClient<Database>,
  meetingId: string,
  question: string,
): Promise<TranscriptSegmentRow[]> {
  const allSegments = await getSegmentsForMeeting(supabase, meetingId);
  const fullTranscriptTokens = estimateTokens(serializeSegments(allSegments));
  if (fullTranscriptTokens <= FULL_TRANSCRIPT_TOKEN_LIMIT) {
    return allSegments;
  }

  const { data: matches, error } = await supabase.rpc("search_transcript_segments", {
    p_meeting_id: meetingId,
    p_query: question,
    p_limit: RETRIEVAL_LIMIT,
  });
  if (error) throw error;

  const targetSeqs = new Set<number>();
  for (const match of matches ?? []) {
    targetSeqs.add(match.seq - 1);
    targetSeqs.add(match.seq);
    targetSeqs.add(match.seq + 1);
  }
  return getSegmentsBySeq(supabase, meetingId, [...targetSeqs]);
}

function needsCitationRepair(answer: AskAnswer): boolean {
  return answer.citations.length === 0 && answer.answer !== NOT_IN_TRANSCRIPT;
}

export async function answerQuestion(
  supabase: SupabaseClient<Database>,
  meeting: MeetingRow,
  question: string,
): Promise<AskQueryRow> {
  const askedToday = await countAskQueriesToday(supabase, meeting.id);
  if (askedToday >= DAILY_QUESTIONS_PER_MEETING) {
    throw new AskLimitReachedError("You've asked the most questions allowed for this meeting today.");
  }

  const context = await retrieveContext(supabase, meeting.id, question);
  const userPrompt = `MEETING_TITLE: ${meeting.title}
QUESTION: ${question}

TRANSCRIPT EXCERPTS:
${serializeSegments(context)}

Answer the question using only the excerpts above.`;

  const projectedTokens = estimateTokens(SYSTEM_PROMPT) + estimateTokens(userPrompt) + ESTIMATED_OUTPUT_TOKENS;
  const quota = await checkAndReserve(supabase, meeting.user_id, { askTokens: projectedTokens });
  if (!quota.ok) {
    throw new QuotaBlockedError(quota.resumeAt);
  }

  const first = await runStructuredAndValidate(AskSchema, SYSTEM_PROMPT, userPrompt, {
    temperature: 0.1,
    model: ASK_MODEL,
  });
  let result = first.result;
  let totalTokens = first.totalTokens;

  if (needsCitationRepair(result)) {
    const repaired = await runStructuredCompletion(SYSTEM_PROMPT, userPrompt + CITATION_REPAIR_SUFFIX, {
      temperature: 0.1,
      model: ASK_MODEL,
    });
    totalTokens += repaired.usage.totalTokens;
    const parsed = AskSchema.safeParse(JSON.parse(repaired.content));
    if (parsed.success) result = parsed.data;
  }

  await recordUsage(supabase, { askTokens: totalTokens }, meeting.user_id);

  // A "not in transcript" answer citing a timestamp would be self-contradictory
  // in the UI (a clickable "Heard at 00:00" next to "this wasn't said") -- the
  // model sometimes attaches one anyway, so clamp it here rather than in the prompt.
  const citations = result.answer === NOT_IN_TRANSCRIPT ? [] : result.citations;

  return insertAskQuery(supabase, {
    meeting_id: meeting.id,
    user_id: meeting.user_id,
    question,
    answer: result.answer,
    citations,
  });
}
