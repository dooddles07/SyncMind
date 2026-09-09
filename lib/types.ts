// Enums mirror docs/DATA-MODEL.md so the backend can be dropped in without renaming.

export type MeetingStatus =
  | "uploading"
  | "transcribing"
  | "analyzing"
  | "ready"
  | "failed"
  | "quota_blocked";

export type TodoStatus = "todo" | "doing" | "done";
export type Priority = "high" | "medium" | "low";
export type EmailTone = "professional" | "friendly" | "brief";

export interface Speaker {
  id: string;
  label: string;
  /** true when SyncMind guessed the name from the audio and nobody has confirmed it */
  inferred: boolean;
}

export interface Segment {
  id: string;
  speakerId: string;
  /** seconds from the start of the recording */
  at: number;
  /** seconds from the start of the recording -- optional since most UI only
   *  needs `at` as a seek-anchor; .srt export needs a real end per cue. */
  end?: number;
  text: string;
}

export interface NoteItem {
  id: string;
  text: string;
  at: number;
}

export interface Notes {
  overview: string;
  topics: NoteItem[];
  decisions: NoteItem[];
  questions: NoteItem[];
}

export interface Todo {
  id: string;
  meetingId: string;
  meetingTitle: string;
  title: string;
  owner: string;
  ownerInferred: boolean;
  due: string | null;
  priority: Priority;
  status: TodoStatus;
  at: number;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  /** seconds */
  duration: number;
  status: MeetingStatus;
  /** only meaningful while transcribing */
  chunksDone: number;
  chunksTotal: number;
  audioAvailable: boolean;
  note?: string;
  /** Set only when status is "failed" -- names which stage broke. */
  errorCode?: string | null;
}

export interface EmailDraft {
  subject: string;
  body: string;
  tone: EmailTone;
  recipients: string[];
}

export interface AskExchange {
  id: string;
  question: string;
  answer: string;
  citations: number[];
}

export interface Usage {
  minutesUsed: number;
  minutesLimit: number;
  retentionDays: number;
}

/** 214 -> "03:34", 3789 -> "1:03:09" */
export function formatTimecode(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** 3120 -> "52 min", 5400 -> "1h 30m" */
export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function isOverdue(todo: Todo, today = new Date()): boolean {
  if (!todo.due || todo.status === "done") return false;
  return new Date(`${todo.due}T23:59:59`) < today;
}

/** "2026-07-26" -> "Jul 26" */
export function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export const statusCopy: Record<MeetingStatus, { label: string; hint: string }> = {
  uploading: { label: "Uploading", hint: "Sending your recording" },
  transcribing: { label: "Writing it down", hint: "Turning the audio into text" },
  analyzing: { label: "Picking out the important bits", hint: "Finding decisions and to-dos" },
  ready: { label: "Ready", hint: "Everything is done" },
  // Deliberately stage-neutral: this is only the fallback for when no real error
  // message came back. The specific cause (which stage, what went wrong) comes
  // from meetings.error_message and is shown in its place whenever it exists.
  failed: { label: "Something went wrong", hint: "This meeting stopped partway through" },
  quota_blocked: { label: "Paused until tomorrow", hint: "You have used today's free minutes" },
};

/**
 * Which pipeline stage an error_code belongs to, as an index into the status
 * stepper's stages. Transcription used to be hardcoded here, so an analysis or
 * email failure still put the warning on "Written down" and told the user their
 * audio was bad when it wasn't.
 */
export function failedStageIndex(errorCode?: string | null): number {
  switch (errorCode) {
    case "TRANSCRIBE_FAILED":
      return 1;
    case "ANALYZE_TOO_LONG":
    case "ANALYZE_INVALID_OUTPUT":
    case "ANALYZE_UNAVAILABLE":
    case "EMAIL_INVALID_OUTPUT":
    case "EMAIL_UNAVAILABLE":
      return 2;
    default:
      return 1;
  }
}
