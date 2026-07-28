# SyncMind — Roadmap

Six milestones to a launched MVP. Estimates assume one developer working focused days; they are sizing, not deadlines. Each milestone ends in something demonstrable — no milestone completes on "code written".

## M0 — Foundations
**Estimate: 1-2 days**

| # | Task |
| --- | --- |
| 0.1 | `git init`, push to `dooddles07/SyncMind` (**public repo** — keeps GitHub Actions cron minutes free), `main` protected |
| 0.2 | `create-next-app` — TypeScript, App Router, Tailwind v4, ESLint |
| 0.3 | shadcn/ui init; add Button, Input, Card, Dialog, Tabs, Badge, Toast, Skeleton, Progress, DropdownMenu, Select, Textarea, AlertDialog, Tooltip, Avatar, Separator, Sheet, Command |
| 0.4 | Design tokens from DESIGN-SYSTEM §2-4 into `app/globals.css`; fonts via `next/font`; `next-themes` wired |
| 0.5 | Create Supabase project; run migrations `0001`-`0008` from DATA-MODEL |
| 0.6 | Generate `lib/supabase/types.ts`; build browser/server/admin clients |
| 0.7 | `.env.example` complete; `.gitignore`; local `.env.local` verified |
| 0.8 | Vercel project connected, preview deploys on PR |
| 0.9 | `ci.yml` — typecheck, lint, unit; `keepalive.yml` — ping `/api/health` every 3 days |
| 0.10 | Vitest and Playwright configured with one passing test each |
| 0.11 | Check `console.groq.com` → Settings → Limits for both models; set real `GROQ_DAILY_*` values in `lib/quota.ts` defaults and log the confirmed numbers in ACTIVITY-LOG (see AI-PIPELINE §7) |

**Exit:** an empty themed app deploys to Vercel, connects to Supabase, and CI is green.

---

## M1 — Auth, shell, and upload
**Estimate: 3-4 days**

| # | Task |
| --- | --- |
| 1.1 | Google OAuth provider configured in Supabase Auth; `/auth/callback` route |
| 1.2 | Landing page per DESIGN-SYSTEM §8 |
| 1.3 | Authed layout: sidebar, user menu, theme toggle, mobile tab bar |
| 1.4 | Route protection via middleware; unauthenticated users redirected |
| 1.5 | Profile auto-creation trigger verified end to end |
| 1.6 | Dashboard with real meeting list, empty state, search |
| 1.7 | `ffmpeg.wasm` Web Worker: probe duration, extract audio from video, transcode to 16 kHz mono Opus |
| 1.8 | Chunker: 10-minute splits with 3s overlap, offsets computed — unit tested |
| 1.9 | `POST /api/meetings` returning signed upload URLs |
| 1.10 | Dropzone with validation, per-chunk upload progress, 2 parallel uploads |
| 1.11 | WASM-unavailable fallback path with an explicit error |

**Exit:** sign in with Google, upload a 45-minute recording, see chunks land in Supabase Storage and rows in `meetings` / `audio_chunks`. Nothing is transcribed yet.

---

## M2 — Transcription
**Estimate: 3-4 days**

| # | Task |
| --- | --- |
| 2.1 | Groq client with timeout, retry ladder, and typed errors |
| 2.2 | `POST /api/pipeline/advance` with advisory locking and idempotency |
| 2.3 | Transcribe-one-chunk unit: download, call Whisper, shift offsets, de-duplicate the seam, insert segments |
| 2.4 | Carryover prompt from the previous chunk's tail |
| 2.5 | `GET /api/meetings/:id/status`; client poller with backoff, refresh-safe |
| 2.6 | `StatusStepper` bound to real state |
| 2.7 | Transcript tab: virtualized list, timestamps, full-text search |
| 2.8 | Audio player with seek-from-timestamp and playback-position highlight |
| 2.9 | `lib/quota.ts` with `usage_daily` accounting; `quota_blocked` state and banner |
| 2.10 | Failure paths: chunk retry, partial preservation, `/api/pipeline/retry` |
| 2.11 | `sweep.yml` daily — advance stalled meetings, purge expired audio |

**Exit:** a 45-minute recording produces a complete, searchable, seekable transcript within 4 minutes wall-clock. Killing the tab mid-run and reopening resumes correctly.

---

## M3 — Minutes, action items, email draft
**Estimate: 4-5 days**

| # | Task |
| --- | --- |
| 3.1 | `lib/ai/structured.ts` — call, parse, validate, repair, fall back |
| 3.2 | Zod schemas from AI-PIPELINE §3 with post-validation clamps |
| 3.3 | Analysis prompt files; single-pass path |
| 3.4 | Map-reduce path above 60k tokens |
| 3.5 | Persist `summaries` + `action_items`; apply speaker labels to segments |
| 3.6 | Gemini fallback client behind the same interface |
| 3.7 | Minutes tab with inline editing and timestamp seek |
| 3.8 | Actions tab: inline-editable table, manual add/delete |
| 3.9 | Speaker rename applying meeting-wide |
| 3.10 | Email prompt + `email_drafts`; `EmailComposer` with tone selector and regenerate warning |
| 3.11 | Cross-meeting kanban at `/actions` with keyboard-accessible status change |
| 3.12 | Eval fixture set and `npm run eval`; hit the §8 targets |

**Exit:** upload → ready produces minutes, action items with owners and dates, and an email draft. Eval targets met. Everything editable.

---

## M4 — Google Calendar and Gmail
**Estimate: 2-3 days**

| # | Task |
| --- | --- |
| 4.1 | Google Cloud project; OAuth consent screen in Testing; enable Gmail + Calendar APIs |
| 4.2 | Incremental-consent connect flow; `/api/google/connect` and `/callback` |
| 4.3 | Refresh token encrypted with AES-256-GCM into `google_connections` |
| 4.4 | Access-token exchange with single-retry refresh on 401 |
| 4.5 | `gmail.drafts.create` from the composer; return the Gmail deep link. **No send path exists in the codebase.** |
| 4.6 | `calendar.events.insert` per action item; store `google_event_id`; bulk add |
| 4.7 | Duplicate prevention and the calendar-linked badge |
| 4.8 | Disconnect with token revocation |
| 4.9 | Settings page: connection state, granted scopes, retention slider, usage |
| 4.10 | Non-allowlisted test user handled with clear copy |

**Exit:** from a processed meeting, create a real Gmail draft and real Calendar events in under 60 seconds, with no duplicates on repeat clicks.

---

## M5 — Ask, export, share, polish, launch
**Estimate: 3-4 days**

| # | Task |
| --- | --- |
| 5.1 | `POST /api/meetings/:id/ask` with FTS retrieval and citation enforcement |
| 5.2 | `AskPanel` with clickable citations and question history |
| 5.3 | Markdown export; print stylesheet for PDF; `.srt` and `.txt` transcript export; `.ics` action export |
| 5.4 | Share link creation, public read-only page, revoke, `noindex` |
| 5.5 | Hard delete: storage objects then cascade; "Delete all my data" in Settings |
| 5.6 | Every list surface has loading / empty / error states |
| 5.7 | Full accessibility pass: contrast, focus order, keyboard path, screen-reader labels, reduced motion |
| 5.8 | Responsive pass at 375 / 768 / 1024 / 1440 |
| 5.9 | Playwright E2E covering the full happy path |
| 5.10 | Sentry wired; error boundaries with useful recovery |
| 5.11 | Manual launch checklist (below) |
| 5.12 | README polish, production deploy, first 5 real users invited to the OAuth allowlist |

**Exit:** MVP live. All PRODUCT-REQUIREMENTS MVP features (F1-F15) shipped.

---

## Manual launch checklist

- [ ] Sign-in works in a clean browser profile, both themes
- [ ] Real 45-minute recording processes end to end
- [ ] Poor-audio recording degrades honestly rather than inventing content
- [ ] The no-clear-actions fixture produces zero action items
- [ ] Gmail draft appears with correct subject and body; nothing was sent
- [ ] Calendar events land on correct dates; second click does not duplicate
- [ ] Share link renders for a signed-out visitor; revoke returns 404
- [ ] A second account cannot reach the first account's meeting by ID
- [ ] Delete removes the storage objects, verified in the Supabase dashboard
- [ ] Full keyboard path from upload to export
- [ ] 375px width usable throughout
- [ ] Quota-blocked state renders with a correct reset time
- [ ] Supabase and Groq dashboards show zero spend

---

## Timeline

| Milestone | Days | Cumulative |
| --- | --- | --- |
| M0 | 1-2 | 2 |
| M1 | 3-4 | 6 |
| M2 | 3-4 | 10 |
| M3 | 4-5 | 15 |
| M4 | 2-3 | 18 |
| M5 | 3-4 | 22 |

**~3-4.5 focused weeks to MVP.**

---

## Risk register

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | Groq free-tier limits tighten or the free tier ends | Medium | High | Provider abstraction in `lib/ai/`; Gemini fallback already implemented; browser-side Whisper via transformers.js documented as the escape hatch |
| R2 | `ffmpeg.wasm` fails on older or mobile browsers | Medium | Medium | Explicit fallback in M1.11; direct upload allowed under 20 MB; error copy tells the user how to compress |
| R3 | 60s Vercel limit exceeded by a slow chunk | Low | High | 10-minute chunks transcribe in 5-20s; if a chunk times out it retries with a 5-minute split |
| R4 | Supabase pauses after inactivity | Medium | Medium | Keep-alive cron every 3 days from M0 |
| R5 | Action-item quality below the trust threshold | Medium | High | Eval suite gates every prompt change; precision prioritized over recall; everything editable |
| R6 | Google OAuth verification blocks growth past 100 users | High | Medium | Expected. Testing mode is fine for MVP. Verification is a Phase-2 task; export-only paths (.ics, copy email) work without any Google connection |
| R7 | 1 GB storage exhausted | Medium | Medium | 7-day retention enforced by cron from M2; Opus transcode cuts size ~10x versus source |
| R8 | Hallucinated commitments damage trust | Low | High | Conservative prompt rules, null-owner default, "AI-inferred" badges, past-date nulling, zero-action fixture in the eval set |
| R9 | Scope creep into Phase 2 during MVP | High | Medium | PRODUCT-REQUIREMENTS §6 is the contract; anything not in F1-F15 is deferred without debate |
| R10 | Vercel Hobby forbids commercial use | Low | Medium | MVP is non-commercial. Monetization requires a paid plan; that is a deliberate later decision, not an accident |
