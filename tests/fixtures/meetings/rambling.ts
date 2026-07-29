import type { MeetingFixture } from "./types";

export const rambling: MeetingFixture = {
  name: "rambling",
  title: "Catch-up Chat",
  meeting_date: "2026-07-27",
  duration_sec: 600,
  segments: [
    { speaker: "Speaker 1", start_sec: 0, text: "Hey, how was your weekend? I ended up just watching a bunch of movies." },
    { speaker: "Speaker 2", start_sec: 10, text: "Nice, mine was pretty quiet too. We should grab coffee sometime, it's been a while." },
    { speaker: "Speaker 1", start_sec: 25, text: "Yeah for sure, whenever works. Anyway, how's the team feeling about things generally?" },
    { speaker: "Speaker 2", start_sec: 40, text: "Honestly pretty good, morale's been fine. Nothing really on fire right now." },
    { speaker: "Speaker 1", start_sec: 55, text: "That's good to hear. We should maybe think about doing a team offsite at some point this year." },
    { speaker: "Speaker 2", start_sec: 70, text: "Could be fun, no strong opinion, whatever the team wants really." },
    { speaker: "Speaker 1", start_sec: 85, text: "Cool, well nothing urgent on my end. Just wanted to check in." },
    { speaker: "Speaker 2", start_sec: 95, text: "Same, no updates really, just good to catch up. Talk soon." },
  ],
  expected: {
    actionItems: [],
  },
};
