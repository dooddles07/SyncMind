import type { MeetingFixture } from "./types";

// Simulates a noisy Whisper transcript: garbled fragments, cut-off words, and
// filler mixed with the few real commitments -- the model must stay
// conservative and not invent structure out of the noise (docs/AI-PIPELINE.md
// section 3 rule 1).
export const poorAudio: MeetingFixture = {
  name: "poor-audio",
  title: "Vendor Sync (bad connection)",
  meeting_date: "2026-07-27",
  duration_sec: 700,
  segments: [
    { speaker: "Speaker 1", start_sec: 0, text: "—can you hear— sorry the line keeps, uh, cutting out on my end" },
    { speaker: "Speaker 2", start_sec: 12, text: "yeah it's, um, choppy but I think I got most of— can you repeat the last part" },
    { speaker: "Speaker 1", start_sec: 24, text: "so the the shipment, I'll send the invoice, the invoice by, um, Thursday" },
    { speaker: "Speaker 2", start_sec: 40, text: "okay— invoice by Thursday, got it, and the, sorry, the— what was the other" },
    { speaker: "Speaker 1", start_sec: 55, text: "—static— can't really hear you, something about the warehouse maybe" },
    { speaker: "Speaker 2", start_sec: 68, text: "never mind, it'll, uh, it'll come up again probably, let's just, yeah" },
    { speaker: "Speaker 1", start_sec: 82, text: "okay I think— are we still, hello? hello can you—" },
    { speaker: "Speaker 2", start_sec: 95, text: "still here, barely, um, I think that's most of it for today anyway" },
  ],
  expected: {
    actionItems: [{ title: "Send the invoice", owner: "Speaker 1", dueDate: "2026-07-30" }],
  },
};
