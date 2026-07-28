import type {
  AskExchange,
  EmailDraft,
  Meeting,
  Notes,
  Segment,
  Speaker,
  Todo,
  Usage,
} from "@/lib/types";

/*
  Mock fixtures. Every export sits behind an async function with the signature the
  real Supabase query will have, so the backend swap touches this file only.

  Fixtures deliberately include the awkward cases: an overdue to-do, guessed owners,
  a meeting whose audio was auto-deleted, a partly failed meeting with its good
  chunks preserved, and the verbatim "not in this recording" answer.
*/

export const meetings: Meeting[] = [
  {
    id: "q3-planning",
    title: "Q3 planning",
    date: "2026-07-24",
    duration: 3127,
    status: "ready",
    chunksDone: 6,
    chunksTotal: 6,
    audioAvailable: true,
  },
  {
    id: "northwind",
    title: "Northwind kickoff call",
    date: "2026-07-24",
    duration: 1860,
    status: "transcribing",
    chunksDone: 3,
    chunksTotal: 5,
    audioAvailable: true,
  },
  {
    id: "dan-1-1",
    title: "1:1 with Dan",
    date: "2026-07-22",
    duration: 1440,
    status: "ready",
    chunksDone: 3,
    chunksTotal: 3,
    audioAvailable: true,
  },
  {
    id: "budget-review",
    title: "Budget review",
    date: "2026-07-15",
    duration: 2640,
    status: "ready",
    chunksDone: 5,
    chunksTotal: 5,
    audioAvailable: false,
    note: "Audio was deleted after 7 days. Your notes and to-dos are still here.",
  },
  {
    id: "vendor-sync",
    title: "Vendor sync",
    date: "2026-07-27",
    duration: 2010,
    status: "failed",
    chunksDone: 4,
    chunksTotal: 6,
    audioAvailable: true,
    note: "We got through most of it, but part of the audio did not come out. Everything up to 34:10 is saved.",
  },
];

export const speakers: Speaker[] = [
  { id: "s1", label: "Maya", inferred: false },
  { id: "s2", label: "Dan", inferred: false },
  { id: "s3", label: "Priya", inferred: true },
];

export const transcript: Segment[] = [
  { id: "t1", speakerId: "s1", at: 244, text: "Alright, let's start with the vendor contract. Where are we on that?" },
  { id: "t2", speakerId: "s2", at: 252, text: "It's sitting with me. I need one more read from legal before we sign anything." },
  { id: "t3", speakerId: "s1", at: 259, text: "Can you get it to legal by Friday? I don't want this slipping into August." },
  { id: "t4", speakerId: "s2", at: 266, text: "Yes. I'll send it Friday morning and copy you on the thread." },
  { id: "t5", speakerId: "s3", at: 274, text: "Quick flag, the pricing change was meant to land in the same release." },
  { id: "t6", speakerId: "s1", at: 283, text: "Let's not stack those. We push the pricing change to Q4 and keep this release clean." },
  { id: "t7", speakerId: "s3", at: 291, text: "Fine by me. I'll update the release notes." },
  { id: "t8", speakerId: "s2", at: 298, text: "One open thing, nobody actually owns the vendor renewal next year." },
  { id: "t9", speakerId: "s1", at: 306, text: "Noted. We'll pick that up once the contract is signed." },
  { id: "t10", speakerId: "s1", at: 1721, text: "Last thing, Dan, can you send the pricing deck to the client by Sunday?" },
  { id: "t11", speakerId: "s2", at: 1728, text: "Sunday works. I'll reuse the deck from the Northwind call." },
];

export const notes: Notes = {
  overview:
    "The team went through Q3 targets and agreed to move the vendor contract forward this week. The pricing change is being pushed to Q4 so this release stays clean. One question is still open: nobody owns the vendor renewal for next year.",
  topics: [
    { id: "k1", text: "Vendor contract needs a final legal read before signing", at: 252 },
    { id: "k2", text: "Pricing change was going to ship in the same release", at: 274 },
    { id: "k3", text: "Client pricing deck is due this weekend", at: 1721 },
  ],
  decisions: [
    { id: "d1", text: "Send the vendor contract to legal by Friday", at: 259 },
    { id: "d2", text: "Push the pricing change to Q4 and keep this release clean", at: 283 },
  ],
  questions: [{ id: "q1", text: "Who owns the vendor renewal next year?", at: 298 }],
};

export const todos: Todo[] = [
  {
    id: "a1",
    meetingId: "q3-planning",
    meetingTitle: "Q3 planning",
    title: "Send the vendor contract to legal",
    owner: "Dan",
    ownerInferred: false,
    due: "2026-07-24",
    priority: "high",
    status: "doing",
    at: 259,
  },
  {
    id: "a2",
    meetingId: "q3-planning",
    meetingTitle: "Q3 planning",
    title: "Send the pricing deck to the client",
    owner: "Dan",
    ownerInferred: false,
    due: "2026-07-26",
    priority: "high",
    status: "todo",
    at: 1721,
  },
  {
    id: "a3",
    meetingId: "q3-planning",
    meetingTitle: "Q3 planning",
    title: "Update the release notes for the Q4 pricing change",
    owner: "Priya",
    ownerInferred: true,
    due: "2026-07-31",
    priority: "medium",
    status: "todo",
    at: 291,
  },
  {
    id: "a4",
    meetingId: "northwind",
    meetingTitle: "Northwind kickoff call",
    title: "Draft the statement of work",
    owner: "Maya",
    ownerInferred: false,
    due: "2026-07-29",
    priority: "medium",
    status: "doing",
    at: 480,
  },
  {
    id: "a5",
    meetingId: "dan-1-1",
    meetingTitle: "1:1 with Dan",
    title: "Find an owner for the vendor renewal",
    owner: "Unassigned",
    ownerInferred: true,
    due: null,
    priority: "low",
    status: "todo",
    at: 298,
  },
  {
    id: "a6",
    meetingId: "budget-review",
    meetingTitle: "Budget review",
    title: "Book the offsite venue",
    owner: "Maya",
    ownerInferred: false,
    due: "2026-07-20",
    priority: "medium",
    status: "done",
    at: 903,
  },
  {
    id: "a7",
    meetingId: "budget-review",
    meetingTitle: "Budget review",
    title: "Circulate the revised headcount plan",
    owner: "Maya",
    ownerInferred: false,
    due: "2026-07-17",
    priority: "high",
    status: "done",
    at: 1450,
  },
];

export const emailDraft: EmailDraft = {
  subject: "Q3 planning — what we agreed",
  tone: "professional",
  recipients: ["dan@example.com", "priya@example.com"],
  body: `Hi both,

Thanks for the time today. Here is where we landed.

We are moving the vendor contract forward this week. Dan is sending it to legal by Friday and will copy me on the thread.

We are holding the pricing change until Q4 so this release stays clean. Priya is updating the release notes.

Still open: nobody owns the vendor renewal for next year. We will pick that up once the contract is signed.

Dan, the client pricing deck is due Sunday.

Maya`,
};

export const askHistory: AskExchange[] = [
  {
    id: "x1",
    question: "What did we decide about the pricing change?",
    answer:
      "You agreed to push it to Q4 so this release stays clean. Priya is updating the release notes.",
    citations: [283, 291],
  },
  {
    id: "x2",
    question: "Did anyone mention the security audit?",
    answer: "That isn't in this recording.",
    citations: [],
  },
];

export const usage: Usage = { minutesUsed: 84, minutesLimit: 180, retentionDays: 7 };

// Query seams. These match the shape the real queries will return.

export async function getMeetings(): Promise<Meeting[]> {
  return meetings;
}

export async function getMeeting(id: string): Promise<Meeting | undefined> {
  return meetings.find((m) => m.id === id);
}

export async function getTranscript(_meetingId: string): Promise<Segment[]> {
  return transcript;
}

export async function getSpeakers(_meetingId: string): Promise<Speaker[]> {
  return speakers;
}

export async function getNotes(_meetingId: string): Promise<Notes> {
  return notes;
}

export async function getTodos(meetingId?: string): Promise<Todo[]> {
  return meetingId ? todos.filter((t) => t.meetingId === meetingId) : todos;
}

export async function getEmailDraft(_meetingId: string): Promise<EmailDraft> {
  return emailDraft;
}

export async function getAskHistory(_meetingId: string): Promise<AskExchange[]> {
  return askHistory;
}

export async function getUsage(): Promise<Usage> {
  return usage;
}

export function speakerOf(id: string): Speaker {
  return speakers.find((s) => s.id === id) ?? speakers[0];
}
