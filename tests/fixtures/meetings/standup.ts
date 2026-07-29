import type { MeetingFixture } from "./types";

export const standup: MeetingFixture = {
  name: "standup",
  title: "Daily Standup",
  meeting_date: "2026-07-27",
  duration_sec: 480,
  segments: [
    { speaker: "Speaker 1", start_sec: 0, text: "Morning everyone, let's go round the table. Priya, you're up." },
    {
      speaker: "Speaker 2",
      start_sec: 8,
      text: "Yesterday I finished the login redesign. Today I'm blocked on the API contract for password reset, waiting on backend.",
    },
    {
      speaker: "Speaker 1",
      start_sec: 25,
      text: "Priya, I'll send you the contract by end of day today.",
    },
    { speaker: "Speaker 3", start_sec: 40, text: "I wrapped up the billing migration script, ran it against staging last night, looked clean." },
    {
      speaker: "Speaker 1",
      start_sec: 55,
      text: "Good. Marcus, can you also run it against the prod snapshot before Friday so we can sign off?",
    },
    { speaker: "Speaker 3", start_sec: 68, text: "Yep, will do, I'll run it against the prod snapshot by Friday." },
    {
      speaker: "Speaker 2",
      start_sec: 80,
      text: "One more thing, we should probably think about revisiting the onboarding flow at some point.",
    },
    { speaker: "Speaker 1", start_sec: 95, text: "Agreed, no owner on that yet, let's not commit to a date. Anything else? No? Let's wrap." },
  ],
  expected: {
    actionItems: [
      { title: "Send the password reset API contract to Priya", owner: "Speaker 1", dueDate: "2026-07-27" },
      { title: "Run the billing migration script against the prod snapshot", owner: "Marcus", dueDate: "2026-07-31" },
    ],
  },
};
