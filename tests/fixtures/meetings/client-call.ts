import type { MeetingFixture } from "./types";

export const clientCall: MeetingFixture = {
  name: "client-call",
  title: "Acme Corp Renewal Call",
  meeting_date: "2026-07-27",
  duration_sec: 900,
  segments: [
    { speaker: "Speaker 1", start_sec: 0, text: "Thanks for joining, Sarah. We wanted to walk through the renewal terms and the SSO request." },
    {
      speaker: "Speaker 2",
      start_sec: 15,
      text: "Sure. Our main blocker is SSO. If you can get us a working SAML integration, we're ready to sign the renewal.",
    },
    {
      speaker: "Speaker 1",
      start_sec: 32,
      text: "Understood. I'll get our engineering team to send you a SAML setup guide by Wednesday.",
    },
    { speaker: "Speaker 2", start_sec: 50, text: "Great, and can you also send over the updated pricing sheet reflecting the 10% loyalty discount we discussed?" },
    { speaker: "Speaker 1", start_sec: 62, text: "Yes, I'll send the updated pricing sheet with the 10% discount today." },
    {
      speaker: "Speaker 2",
      start_sec: 78,
      text: "Perfect. We decided internally to go with the annual plan instead of monthly, that's locked in on our end.",
    },
    { speaker: "Speaker 1", start_sec: 95, text: "Noted, I'll reflect the annual plan in the contract draft." },
    { speaker: "Speaker 2", start_sec: 110, text: "One open question for us: does the annual plan include the audit log add-on or is that separate billing?" },
    { speaker: "Speaker 1", start_sec: 125, text: "Good question, I don't have that in front of me, let me check and get back to you." },
  ],
  expected: {
    actionItems: [
      { title: "Send Sarah a SAML setup guide", owner: "Speaker 1", dueDate: "2026-07-29" },
      { title: "Send the updated pricing sheet with the 10% loyalty discount", owner: "Speaker 1", dueDate: "2026-07-27" },
    ],
  },
};
