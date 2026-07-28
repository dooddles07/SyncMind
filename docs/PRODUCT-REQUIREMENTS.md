# SyncMind — Product Requirements

## 1. Problem

Meetings produce decisions and commitments, but the record of them lives in whoever happened to take notes. The common failure chain:

1. Nobody takes notes, or one person takes bad ones while half-listening.
2. Minutes never get written, or get written hours later from memory.
3. Action items are never separated from discussion, so nobody knows who owes what.
4. The follow-up email is a chore, so it goes out late or not at all.
5. Deadlines mentioned out loud never reach anyone's calendar.

The cost is roughly 15-25 minutes of admin per meeting for the organizer, plus the invisible cost of commitments quietly dropped.

Existing tools that solve this (Otter, Fireflies, Fathom, Granola) are subscription products, most gate minutes and integrations behind paid plans, and several require a bot to join the call live.

## 2. Solution

SyncMind takes a recording that already exists — a Zoom/Meet/Teams export, a phone voice memo, an in-person recording — and turns it into a finished post-meeting package:

- A timestamped, speaker-labeled transcript.
- Structured minutes: summary, topics, decisions, open questions.
- Action items with owner, due date, and priority.
- A follow-up email drafted in the user's voice, one click from opening in the user's own Gmail.
- Calendar events for action items with dates, delivered as a standard `.ics` file.

No bot joins the meeting. No live capture. Upload-and-go, which is what makes it possible to run at zero cost.

## 3. Goals

| # | Goal | Measure |
| --- | --- | --- |
| G1 | Kill post-meeting admin | Median time from upload to "sent follow-up" under 2 minutes of user attention |
| G2 | Minutes people actually trust | User edits fewer than 20% of generated action items before accepting |
| G3 | Nothing gets dropped | Every action item with a stated date reaches a calendar in one click |
| G4 | Free to run and free to use | $0/month infrastructure at MVP traffic (≤ 100 users, ≤ 300 meetings/mo) |
| G5 | Feels good enough to keep open | Return rate: ≥ 40% of users upload a second meeting within 14 days |

## 4. Non-goals (explicitly out of scope)

- **Live meeting bots / real-time transcription.** Requires persistent infra; breaks the zero-cost constraint.
- **Video processing.** Audio only. Video files are accepted but only the audio track is extracted client-side.
- **Multi-tenant teams, roles, billing.** Single-user accounts. Sharing is read-only links.
- **CRM / Jira / Slack / Notion integrations.** Phase 3 at the earliest.
- **Speaker identification by voiceprint.** True diarization needs paid APIs. See "diarization-lite" in §6.
- **Mobile apps.** Responsive web only.
- **Languages beyond English for generation.** Whisper transcribes many languages; minutes generation is tuned and tested for English at MVP.

## 5. Users

### Persona A — Maya, Operations Lead (primary)
Runs 6-10 internal meetings a week. She is the default note-taker and the default chaser. Cares most about action items with owners, and about sending the recap the same day. Technical comfort: high. Uses Google Workspace.

*Needs:* accurate owner assignment, fast turnaround, editable output before anything is sent.

### Persona B — Dan, Freelance Consultant (primary)
Two to four client calls a week. Every call has follow-ups he bills against. He needs a written record for his own protection and a professional recap email to the client within the hour. Technical comfort: medium.

*Needs:* polished client-facing email, exportable minutes as a document, a searchable archive per client.

### Persona C — Priya, Student / Researcher (secondary)
Records lectures, interviews, and study group sessions. Wants a searchable transcript and a summary far more than she wants calendar events. Cost-sensitive to the point that any paid tool is a non-starter.

*Needs:* transcript search, "ask this meeting" Q&A, free forever.

## 6. Features

### MVP — must ship

| ID | Feature | Description |
| --- | --- | --- |
| F1 | Google sign-in | Supabase Auth with Google OAuth. No password accounts. |
| F2 | Upload recording | Drag-and-drop or file picker. Accepts mp3, m4a, wav, webm, ogg, mp4, mov. Video has audio extracted in-browser. Files chunked client-side into ≤10-minute segments. Max 2 hours per meeting at MVP. |
| F3 | Live processing status | Stage-labeled progress: Uploading → Transcribing (n/m chunks) → Analyzing → Ready. Survives page refresh; state lives in the DB. |
| F4 | Transcript view | Timestamped segments, speaker labels, clicking a timestamp seeks the embedded audio player. Full-text search within the transcript. |
| F5 | Diarization-lite | The LLM assigns speaker labels (Speaker 1/2/3) and, where names are said aloud ("Thanks, Dan"), maps them to real names. Users can rename any speaker once, applying across the whole transcript. |
| F6 | AI minutes | Summary paragraph, bulleted key topics, explicit Decisions list, Open Questions list. Each item carries the timestamp it came from. |
| F7 | Action items | Extracted with title, owner, due date, priority, and source timestamp. Fully editable inline. Add/delete manually. |
| F8 | Action item board | Cross-meeting kanban: To do / In progress / Done. Filter by owner, meeting, overdue. |
| F9 | Follow-up email draft | Generated recap email with editable subject and body, plus tone selector (Professional / Friendly / Brief). One click opens a Gmail compose window pre-filled with the text, via `mail.google.com/mail/?view=cm`, plus copy-to-clipboard and a `mailto:` fallback for non-Gmail users. **No Gmail API, no OAuth scope, no send code path — SyncMind cannot send email even in principle.** |
| F10 | Calendar push | For any action item with a due date, one click downloads a `.ics` file (single event or the full meeting's dated to-dos) that opens directly in Google Calendar, Outlook, or Apple Calendar. **No Calendar API, no OAuth scope.** |
| F11 | Ask this meeting | A question box over a single meeting's transcript. Answers cite timestamps. |
| F12 | Export | Download minutes as Markdown or PDF (print stylesheet). Download transcript as .txt or .srt. Download action items as .ics. |
| F13 | Share link | Generate a read-only public URL for a meeting's minutes + action items (transcript optional). Revocable. Not indexed. |
| F14 | Dashboard | Meeting list with title, date, duration, status, action-item counts. Search across all meetings. |
| F15 | Delete meeting | Hard-deletes the audio file, transcript, and all derived records. |

### Phase 2 — after MVP is stable

- Recurring-meeting grouping and a "what changed since last time" digest.
- Two-way calendar read: pull upcoming events, attach a recording to a known event, prefill title and attendees.
- Email recap sent directly (with explicit per-send confirmation) rather than draft-only.
- Templates: standup, 1:1, client call, retro — each with a tailored minutes structure.
- In-browser recording for in-person meetings.
- Bulk upload.

### Later — only if there is demand

- Team workspaces with shared meetings.
- Slack / Notion / Linear export.
- Non-English minutes generation.
- Voiceprint speaker identification.

## 7. User stories with acceptance criteria

**US-1 — Upload and process**
*As Maya, I upload a 45-minute recording and get finished minutes without babysitting the page.*
- Given a supported file under the size cap, when I drop it on the upload zone, then upload begins immediately with a visible progress bar.
- Given upload completes, when processing starts, then I see named stages and a per-chunk counter.
- Given I refresh or close the tab, when I return to the meeting, then the status reflects real progress, not a reset.
- Given processing completes, when I open the meeting, then transcript, minutes, and action items are all present.
- Given a chunk fails, when the retry budget is exhausted, then the meeting shows a clear error with a Retry button, and any successfully transcribed chunks are preserved.

**US-2 — Correct the AI**
*As Maya, I fix what the AI got wrong before anyone else sees it.*
- Given an action item, when I click any field, then it becomes editable inline and saves on blur.
- Given a speaker label, when I rename it, then every segment by that speaker updates.
- Given minutes text, when I edit it, then my edit persists and is what gets exported and emailed.

**US-3 — Send the recap**
*As Dan, I send a client recap in under a minute.*
- Given a processed meeting, when I open the Email tab, then a subject and body are already drafted.
- Given I pick a different tone, when I confirm, then the body regenerates while my manual edits are warned about first.
- Given I click "Open this in Gmail", then a new Gmail compose tab opens with the recipients, subject, and body already filled in, and I press send myself.
- Given the drafted email is too long for a compose URL, then the button is replaced by a "Copy the whole thing" action instead of silently truncating.
- SyncMind holds no Gmail scope and has no code path capable of sending mail.

**US-4 — Nothing gets dropped**
*As Maya, deadlines land on my calendar.*
- Given action items with due dates, when I click "Put all dates in my calendar", then a single `.ics` file downloads with one event per dated action item.
- Given a single action item, when I click "Save the date", then a one-event `.ics` file downloads for just that item.
- Opening the file in Google Calendar, Outlook, or Apple Calendar adds the event; SyncMind never talks to a calendar API directly, so there is no account to connect first.

**US-5 — Find things later**
*As Priya, I find what was said without re-listening.*
- Given a transcript, when I search a term, then matches highlight and I can jump between them.
- Given I ask a question in "Ask this meeting", then I get an answer with at least one clickable timestamp citation.
- Given the transcript does not contain the answer, then the response says so rather than inventing one.

**US-6 — Privacy control**
*As any user, I control my recordings.*
- Given a meeting, when I delete it, then the audio object, transcript rows, and derived records are removed and the meeting no longer appears.
- Given a share link, when I revoke it, then the public URL returns 404 immediately.
- Given another user's meeting ID, when I request it, then I get 404 — enforced by RLS, not by the UI.

## 8. Primary user flow

```
Landing → Sign in with Google → Dashboard (empty state)
   → Upload: drop file → title auto-filled from filename, editable → Start
   → Processing screen: Uploading → Transcribing 3/5 → Analyzing → Ready
   → Meeting Detail
        ├─ Minutes tab: summary, topics, decisions, open questions   [edit]
        ├─ Transcript tab: player + timestamped segments + search
        ├─ Actions tab: action item table                            [edit]
        ├─ Email tab: draft + tone → Open this in Gmail
        └─ Ask tab: question box with cited answers
   → Download all due dates as .ics
   → Export Markdown / PDF, or generate share link
   → Dashboard → Action Items board tracks everything across meetings
```

## 9. Success metrics

| Metric | Target at 90 days |
| --- | --- |
| Upload → Ready wall-clock, 45-min recording | < 4 minutes |
| User attention time, upload → follow-up drafted | < 2 minutes |
| Action items edited before acceptance | < 20% |
| Second-upload rate within 14 days | ≥ 40% |
| Processing failure rate | < 3% of uploads |
| Monthly infrastructure spend | $0 |

## 10. Constraints shaping the product

These are not implementation details; they define what the product can promise.

- **Free-tier transcription** means a daily ceiling on audio minutes. The UI must surface remaining quota and degrade honestly ("Transcription capacity reached for today — queued for tomorrow") rather than failing silently.
- **Serverless execution limits** mean processing is staged and resumable, not one long request. This is why status is a database field, not an in-memory promise.
- **Storage is 1 GB.** Audio is deleted automatically 7 days after processing unless the user pins the meeting. This is a stated product policy, not a hidden cleanup job.
- **No Gmail or Calendar API integration, by design, not by omission.** Google's restricted-scope (`gmail.compose`) and sensitive-scope (`calendar.events`) verification requires a paid third-party security assessment to leave Testing mode, and Testing-mode refresh tokens expire every 7 days — incompatible with an always-free, always-on product. Email and calendar features are delivered as a Gmail compose deep link and a downloadable `.ics` file instead: zero API surface, nothing to verify, nothing that expires. Google sign-in (`email`/`profile` scopes only) is unaffected and ships in Production mode.
