import type {
  AskExchange,
  EmailDraft,
  Meeting,
  MeetingStatus,
  Notes,
  Segment,
  Speaker,
  Todo,
  Usage,
} from "@/lib/types";
import { getActionItems } from "@/server/models/action-item-model";
import { getAskQueriesForMeeting } from "@/server/models/ask-query-model";
import { getEmailDraftForMeeting } from "@/server/models/email-draft-model";
import { getMeetingById, getMeetingsForUser, type MeetingRow } from "@/server/models/meeting-model";
import { getSummaryForMeeting } from "@/server/models/summary-model";
import { getSegmentsForMeeting, getSpeakerLabelsForMeeting } from "@/server/models/transcript-model";
import { createClient } from "@/server/config/supabase-server";

/*
  Real Supabase queries, swapped in from the original mock fixtures per the
  documented contract (docs/ARCHITECTURE.md section 4: "lib/mock/ -- retired once
  server/models/ lands"). Every getter keeps its original signature so no page.tsx
  call site changed.

  Meetings, transcripts, and to-dos all read for real now. There is no AI pipeline
  yet (M2/M3), so a freshly uploaded meeting correctly comes back with an empty
  transcript, no notes, no action items -- that is real data, not a fallback.
*/

function toMeeting(row: MeetingRow): Meeting {
  return {
    id: row.id,
    title: row.title,
    date: row.meeting_date,
    duration: row.duration_sec,
    // DB's meeting_status also allows "draft", which we never persist -- the
    // controller always inserts directly as "uploading" (server/controllers/
    // meeting-controller.ts), so this narrowing is safe in practice.
    status: row.status as MeetingStatus,
    // All-or-nothing for this pass: a meeting only becomes visible after every
    // chunk has finished uploading (see finalizeUpload), so chunksDone is always
    // chunksTotal by the time a page can read it. Real partial progress during
    // upload is shown client-side, not read back from the DB.
    chunksDone: row.chunk_count,
    chunksTotal: row.chunk_count,
    audioAvailable: row.audio_purged_at === null,
    note: row.error_message ?? undefined,
  };
}

export async function getMeetings(): Promise<Meeting[]> {
  const supabase = await createClient();
  const rows = await getMeetingsForUser(supabase);
  return rows.map(toMeeting);
}

export async function getMeeting(id: string): Promise<Meeting | undefined> {
  const supabase = await createClient();
  const row = await getMeetingById(supabase, id);
  return row ? toMeeting(row) : undefined;
}

export async function getTranscript(meetingId: string): Promise<Segment[]> {
  const supabase = await createClient();
  const rows = await getSegmentsForMeeting(supabase, meetingId);
  return rows.map((row) => ({
    id: String(row.id),
    speakerId: row.speaker ?? "unknown",
    at: row.start_sec,
    text: row.text,
  }));
}

export async function getSpeakers(meetingId: string): Promise<Speaker[]> {
  const supabase = await createClient();
  const labels = await getSpeakerLabelsForMeeting(supabase, meetingId);
  // No "confirmed vs. guessed" tracking exists in the schema yet -- speaker
  // resolution is M3 work. Defaults to false until that lands.
  return labels.map((label) => ({ id: label, label, inferred: false }));
}

export async function getNotes(meetingId: string): Promise<Notes> {
  const supabase = await createClient();
  const row = await getSummaryForMeeting(supabase, meetingId);
  if (!row) return { overview: "", topics: [], decisions: [], questions: [] };

  // topics' JSONB shape is { title, points[], atSec } (docs/DATA-MODEL.md section 3)
  // -- richer than NoteItem's flat { text, at }. Flattened to the title for now;
  // reconciling this is M3 work, alongside the real summarization UI.
  const topics = row.topics as { title: string; atSec: number }[];
  const decisions = row.decisions as { text: string; atSec: number }[];
  const questions = row.open_questions as { text: string; atSec: number }[];

  return {
    overview: row.overview,
    topics: topics.map((t, i) => ({ id: `topic-${i}`, text: t.title, at: t.atSec })),
    decisions: decisions.map((d, i) => ({ id: `decision-${i}`, text: d.text, at: d.atSec })),
    questions: questions.map((q, i) => ({ id: `question-${i}`, text: q.text, at: q.atSec })),
  };
}

export async function getTodos(meetingId?: string): Promise<Todo[]> {
  const supabase = await createClient();
  const rows = await getActionItems(supabase, meetingId);
  return rows.map((row) => ({
    id: row.id,
    meetingId: row.meeting_id,
    meetingTitle: row.meetings?.title ?? "",
    title: row.title,
    owner: row.owner_name ?? "Unassigned",
    // No dedicated "owner is a guess" column -- an AI-generated item nobody has
    // since edited is the closest real proxy available today.
    ownerInferred: row.ai_generated && !row.edited_by_user,
    due: row.due_date,
    priority: row.priority,
    status: row.status === "in_progress" ? "doing" : row.status,
    at: row.source_sec ?? 0,
  }));
}

export async function getEmailDraft(meetingId: string): Promise<EmailDraft> {
  const supabase = await createClient();
  const row = await getEmailDraftForMeeting(supabase, meetingId);
  if (!row) return { subject: "", body: "", tone: "professional", recipients: [] };
  return {
    subject: row.subject,
    body: row.body_md,
    tone: row.tone,
    recipients: row.recipients as string[],
  };
}

export async function getAskHistory(meetingId: string): Promise<AskExchange[]> {
  const supabase = await createClient();
  const rows = await getAskQueriesForMeeting(supabase, meetingId);
  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    citations: (row.citations as { atSec: number }[]).map((c) => c.atSec),
  }));
}

// Usage stays a fixture: real numbers need lib/quota.ts's not-yet-built limit logic
// (see docs/GAP-ANALYSIS.md P1.5), not a plain table read.
const usage: Usage = { minutesUsed: 84, minutesLimit: 180, retentionDays: 7 };

export async function getUsage(): Promise<Usage> {
  return usage;
}
