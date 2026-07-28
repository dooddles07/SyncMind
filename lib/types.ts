// Enums mirror docs/DATA-MODEL.md exactly. Do not invent values.

export type MeetingStatus =
  | "draft"
  | "uploading"
  | "transcribing"
  | "analyzing"
  | "ready"
  | "failed"
  | "quota_blocked";

export type ActionStatus = "todo" | "in_progress" | "done";
export type ActionPriority = "low" | "medium" | "high";
export type EmailTone = "professional" | "friendly" | "brief";

/** AI-derived values stay marked until a person confirms them. */
export type Confidence = "stated" | "inferred";

export interface Meeting {
  id: string;
  title: string;
  date: string;
  durationSec: number;
  status: MeetingStatus;
  /** Rendered verbatim in the UI. Never re-word it client-side. */
  stageDetail: string | null;
  partsDone: number;
  partsTotal: number;
  actionCount: number;
  overdueCount: number;
  audioPurgedAt: string | null;
}

export interface Speaker {
  id: string;
  label: string;
  confidence: Confidence;
}

export interface TranscriptSegment {
  id: string;
  atSec: number;
  speakerId: string;
  text: string;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  meetingTitle: string;
  title: string;
  owner: string | null;
  dueDate: string | null;
  priority: ActionPriority;
  status: ActionStatus;
  confidence: Confidence;
  atSec: number | null;
  calendarEventId: string | null;
}

export interface MinutesSection {
  heading: string;
  items: { text: string; atSec: number | null }[];
}

export const ACTION_STATUS_LABEL: Record<ActionStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export const PRIORITY_LABEL: Record<ActionPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const TONE_LABEL: Record<EmailTone, string> = {
  professional: "Professional",
  friendly: "Friendly",
  brief: "Brief",
};

/** Overdue is never signalled by colour alone, so callers pair this with the word. */
export function isOverdue(item: ActionItem, now = new Date()): boolean {
  if (!item.dueDate || item.status === "done") return false;
  return new Date(item.dueDate) < now;
}

export function formatTimestamp(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function formatDuration(sec: number): string {
  return `${Math.round(sec / 60)} min`;
}
