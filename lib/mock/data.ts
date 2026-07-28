import type {
  ActionItem,
  Meeting,
  MinutesSection,
  Speaker,
  TranscriptSegment,
} from "@/lib/types";

/*
  Mock data layer. Every export is shaped exactly like the real query will be,
  so swapping in Supabase later touches this file and nothing else.
  Keep the async signatures even though nothing awaits — screens should be
  written against the async shape from the start.
*/

export const MEETINGS: Meeting[] = [
  {
    id: "q3-planning",
    title: "Q3 Planning",
    date: "2026-07-24",
    durationSec: 3120,
    status: "ready",
    stageDetail: null,
    partsDone: 6,
    partsTotal: 6,
    actionCount: 7,
    overdueCount: 2,
    audioPurgedAt: null,
  },
  {
    id: "northwind",
    title: "Client — Northwind",
    date: "2026-07-24",
    durationSec: 1860,
    status: "transcribing",
    stageDetail: "Writing up part 3 of 5",
    partsDone: 3,
    partsTotal: 5,
    actionCount: 0,
    overdueCount: 0,
    audioPurgedAt: null,
  },
  {
    id: "one-on-one-dan",
    title: "1:1 with Dan",
    date: "2026-07-22",
    durationSec: 1440,
    status: "ready",
    stageDetail: null,
    partsDone: 3,
    partsTotal: 3,
    actionCount: 3,
    overdueCount: 0,
    audioPurgedAt: null,
  },
  {
    id: "retro-14",
    title: "Retro — Sprint 14",
    date: "2026-07-21",
    durationSec: 2760,
    status: "failed",
    // verbatim, see docs/UI-BUILD-PLAN.md "Copy"
    stageDetail:
      "Part 4 did not go through after three tries. Parts 1 to 3 are saved and ready to read.",
    partsDone: 3,
    partsTotal: 6,
    actionCount: 0,
    overdueCount: 0,
    audioPurgedAt: null,
  },
  {
    id: "board-review",
    title: "Board review",
    date: "2026-07-18",
    durationSec: 4200,
    status: "ready",
    stageDetail: null,
    partsDone: 7,
    partsTotal: 7,
    actionCount: 4,
    overdueCount: 0,
    // older than the 7 day retention window
    audioPurgedAt: "2026-07-25",
  },
];

export const SPEAKERS: Speaker[] = [
  { id: "s1", label: "Maya", confidence: "stated" },
  { id: "s2", label: "Dan", confidence: "inferred" },
  { id: "s3", label: "Priya", confidence: "stated" },
  { id: "s4", label: "Speaker 4", confidence: "inferred" },
];

export const TRANSCRIPT: TranscriptSegment[] = [
  { id: "t1", atSec: 252, speakerId: "s1", text: "We need the vendor contract signed before the quarter closes." },
  { id: "t2", atSec: 259, speakerId: "s2", text: "I'll get it to legal by Friday." },
  { id: "t3", atSec: 266, speakerId: "s1", text: "Good. Can you copy me on that thread?" },
  { id: "t4", atSec: 274, speakerId: "s2", text: "Will do. I'll also loop in procurement so nothing stalls." },
  { id: "t5", atSec: 288, speakerId: "s3", text: "One thing to flag: the renewal date moved to October." },
  { id: "t6", atSec: 724, speakerId: "s1", text: "On pricing, I think we hold until Q4. The sales team is mid-cycle." },
  { id: "t7", atSec: 741, speakerId: "s3", text: "Agreed. Changing it now would confuse the pipeline." },
  { id: "t8", atSec: 1721, speakerId: "s1", text: "So we delay the pricing change to Q4. Everyone good with that?" },
  { id: "t9", atSec: 2052, speakerId: "s1", text: "Who owns the vendor renewal? We never assigned it." },
  { id: "t10", atSec: 2068, speakerId: "s4", text: "Let's pick that up next week." },
];

export const MINUTES: MinutesSection[] = [
  {
    heading: "Overview",
    items: [
      {
        text: "The team reviewed Q3 targets and agreed to move the vendor contract forward. Pricing changes were deferred so the sales team can finish the current cycle.",
        atSec: null,
      },
    ],
  },
  {
    heading: "Key topics",
    items: [
      { text: "Vendor contract timeline", atSec: 252 },
      { text: "Q3 pricing review", atSec: 724 },
      { text: "Headcount for the support pod", atSec: 1980 },
    ],
  },
  {
    heading: "Decisions",
    items: [
      { text: "Move contract to legal by Friday", atSec: 724 },
      { text: "Delay the pricing change to Q4", atSec: 1721 },
    ],
  },
  {
    heading: "Open questions",
    items: [{ text: "Who owns vendor renewal?", atSec: 2052 }],
  },
];

export const ACTION_ITEMS: ActionItem[] = [
  {
    id: "a1",
    meetingId: "q3-planning",
    meetingTitle: "Q3 Planning",
    title: "Send pricing deck",
    owner: "Dan",
    dueDate: "2026-07-26",
    priority: "high",
    status: "todo",
    confidence: "stated",
    atSec: 780,
    calendarEventId: null,
  },
  {
    id: "a2",
    meetingId: "q3-planning",
    meetingTitle: "Q3 Planning",
    title: "Sign vendor contract",
    owner: "Maya",
    // in the past, so this renders overdue
    dueDate: "2026-07-22",
    priority: "high",
    status: "todo",
    confidence: "stated",
    atSec: 259,
    calendarEventId: null,
  },
  {
    id: "a3",
    meetingId: "northwind",
    meetingTitle: "Client — Northwind",
    title: "Draft the SOW",
    owner: "Maya",
    dueDate: "2026-07-29",
    priority: "medium",
    status: "in_progress",
    confidence: "stated",
    atSec: 410,
    calendarEventId: "evt_1",
  },
  {
    id: "a4",
    meetingId: "q3-planning",
    meetingTitle: "Q3 Planning",
    title: "Book the venue",
    owner: "Priya",
    dueDate: "2026-08-02",
    priority: "medium",
    status: "todo",
    // AI guessed the owner, so it stays marked until someone confirms
    confidence: "inferred",
    atSec: 1990,
    calendarEventId: null,
  },
  {
    id: "a5",
    meetingId: "q3-planning",
    meetingTitle: "Q3 Planning",
    title: "Confirm renewal date",
    owner: "Priya",
    dueDate: "2026-10-01",
    priority: "low",
    status: "todo",
    confidence: "inferred",
    atSec: 288,
    calendarEventId: null,
  },
  {
    id: "a6",
    meetingId: "one-on-one-dan",
    meetingTitle: "1:1 with Dan",
    title: "Send agenda",
    owner: "Dan",
    dueDate: "2026-07-18",
    priority: "low",
    status: "done",
    confidence: "stated",
    atSec: 120,
    calendarEventId: null,
  },
  {
    id: "a7",
    meetingId: "q3-planning",
    meetingTitle: "Q3 Planning",
    title: "Book venue deposit",
    owner: "Maya",
    dueDate: "2026-07-20",
    priority: "medium",
    status: "done",
    confidence: "stated",
    atSec: 2100,
    calendarEventId: "evt_2",
  },
];

export const EMAIL_DRAFT = {
  subject: "Q3 Planning — recap and next steps",
  recipients: ["maya@acme.com", "dan@acme.com", "priya@acme.com"],
  body: `Hi both,

Thanks for the time today. We agreed to move the vendor contract to legal by Friday and to delay the pricing change to Q4.

Action items:
- Send pricing deck — Dan, Jul 26
- Sign vendor contract — Maya, Jul 22
- Draft the SOW — Maya, Jul 29

The full minutes are attached below.`,
};

export const ASK_HISTORY = [
  {
    id: "q1",
    question: "Who owns the vendor renewal?",
    answer: "Nobody took it on. Maya raised it at 34:12 and it was left open.",
    citations: [2052, 2208],
  },
  {
    id: "q2",
    question: "What is the Q4 headcount plan?",
    // verbatim. When the transcript does not contain the answer, say so rather than invent one.
    answer: "That does not appear in this meeting's transcript.",
    citations: [] as number[],
  },
];

export const USAGE = {
  minutesUsed: 82,
  minutesLimit: 120,
  resetsAt: "midnight",
};

// --- query seams. same signatures the real data layer will expose ---

export async function listMeetings(): Promise<Meeting[]> {
  return MEETINGS;
}

export async function getMeeting(id: string): Promise<Meeting | undefined> {
  return MEETINGS.find((m) => m.id === id);
}

export async function getTranscript(_meetingId: string): Promise<TranscriptSegment[]> {
  return TRANSCRIPT;
}

export async function getSpeakers(_meetingId: string): Promise<Speaker[]> {
  return SPEAKERS;
}

export async function getMinutes(_meetingId: string): Promise<MinutesSection[]> {
  return MINUTES;
}

export async function listActionItems(meetingId?: string): Promise<ActionItem[]> {
  return meetingId
    ? ACTION_ITEMS.filter((a) => a.meetingId === meetingId)
    : ACTION_ITEMS;
}

export function speakerById(id: string): Speaker | undefined {
  return SPEAKERS.find((s) => s.id === id);
}
