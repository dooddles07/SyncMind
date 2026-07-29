import type { MeetingFixture } from "./types";

export const planning: MeetingFixture = {
  name: "planning",
  title: "Q3 Roadmap Planning",
  meeting_date: "2026-07-27",
  duration_sec: 1500,
  segments: [
    { speaker: "Speaker 1", start_sec: 0, text: "Let's lock the Q3 roadmap. First up, do we ship the mobile app or the API v2 first?" },
    { speaker: "Speaker 2", start_sec: 20, text: "I vote API v2 first, three of our biggest customers are blocked on it." },
    { speaker: "Speaker 3", start_sec: 35, text: "Agreed, let's decide API v2 ships first, mobile app moves to Q4." },
    { speaker: "Speaker 1", start_sec: 50, text: "Decision made: API v2 first, mobile app pushed to Q4. Elena, can you write up the API v2 spec by August 3rd?" },
    { speaker: "Speaker 2", start_sec: 70, text: "Yes, I'll have the API v2 spec done by August 3rd." },
    {
      speaker: "Speaker 3",
      start_sec: 90,
      text: "We also decided to drop the legacy CSV export feature entirely, it's costing us support time and almost nobody uses it.",
    },
    { speaker: "Speaker 1", start_sec: 110, text: "Confirmed, CSV export is deprecated. Tom, can you file the deprecation notice by Friday?" },
    { speaker: "Speaker 3", start_sec: 125, text: "Sure, I'll file the deprecation notice by Friday." },
    {
      speaker: "Speaker 2",
      start_sec: 140,
      text: "Someday we should also revisit the whole notifications system, it's a mess, but that's not this quarter, no rush on that.",
    },
    { speaker: "Speaker 1", start_sec: 160, text: "Fair, flagging it, not committing anyone or any date to it right now." },
  ],
  expected: {
    actionItems: [
      { title: "Write up the API v2 spec", owner: "Elena", dueDate: "2026-08-03" },
      { title: "File the CSV export deprecation notice", owner: "Tom", dueDate: "2026-07-31" },
    ],
  },
};
