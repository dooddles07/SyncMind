# SyncMind — Roadmap

Six milestones to a launched MVP. Estimates assume one developer working focused days; they are sizing, not deadlines. Each milestone ends in something demonstrable — no milestone completes on "code written".

## M0 — Foundations
**Estimate: 1-2 days**

| # | Task |
| --- | --- |
| 0.1 | `git init`, push to `dooddles07/SyncMind` (**public repo** — keeps GitHub Actions cron minutes free), `main` protected |
| 0.2 | `create-next-app` — TypeScript, App Router, Tailwind v4, ESLint |
| 0.3 | shadcn/ui init; add Button, Input, Card, Dialog, Tabs, Badge, Toast, Skeleton, Progress, DropdownMenu, Select, Textarea, AlertDialog, Tooltip, Avatar, Separator, Sheet, Command |
| 0.4 | **Done.** Design tokens (Room Tone, `app/globals.css` — the design-system doc was folded into code, see `CLAUDE.md`); fonts via `next/font`; `next-themes` wired |
| 0.5 | Create Supabase project; run migrations `0001`-`0008` from DATA-MODEL |
| 0.6 | Generate Supabase types; build client factories in `server/config/supabase.ts` (see `ARCHITECTURE.md` §4 — backend folder structure locked 2026-07-28) |
| 0.7 | `.env.example` complete; `.gitignore`; local `.env.local` verified |
| 0.8 | Vercel project connected, preview deploys on PR |
| 0.9 | `ci.yml` — **done**: typecheck + lint + build on every push and PR, all green. Unit step still waits on Vitest (not configured). `keepalive.yml` — **done**: every 3 days, pings `/api/health` and self-commits a heartbeat so GitHub never auto-disables it from 60 days of repo inactivity, independent of deploy state. See `docs/GAP-ANALYSIS.md` P0.2. |
| 0.10 | **Vitest done**: 28 tests across `lib/types.ts`, `lib/export/ics.ts`, `lib/export/gmail.ts` — every pure function that exists in the codebase so far. Playwright still not configured; nothing is wired to anything real yet for an E2E happy-path to meaningfully exercise. |
| 0.11 | **Done**: real `GROQ_DAILY_*` values confirmed at `console.groq.com` → Limits and set in `.env.example`, logged in ACTIVITY-LOG. `lib/quota.ts` itself still needs building (M2.9) — see AI-PIPELINE §7 for two gaps found (per-minute and per-hour caps, not just daily) it must account for |

**Exit:** an empty themed app deploys to Vercel, connects to Supabase, and CI is green.

---

## M1 — Auth, shell, and upload
**Estimate: 3-4 days**

| # | Task |
| --- | --- |
| 1.1 | Google OAuth provider configured in Supabase Auth; `/auth/callback` route |
| 1.2 | **Done.** Landing page (`app/page.tsx`, `components/marketing/**`) |
| 1.3 | Authed layout: sidebar, user menu, theme toggle, mobile tab bar |
| 1.4 | Route protection via middleware; unauthenticated users redirected |
| 1.5 | Profile auto-creation trigger verified end to end |
| 1.6 | Dashboard with real meeting list, empty state, search |
| 1.7 | `ffmpeg.wasm` Web Worker: probe duration, extract audio from video, transcode to 16 kHz mono Opus. **Use `@ffmpeg/core` (single-threaded), not `@ffmpeg/core-mt`** — decided in `ARCHITECTURE.md` §3.4, avoids a site-wide COOP/COEP header requirement |
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
| 3.1 | `server/controllers/` — structured call, parse, validate, repair, fall back |
| 3.2 | Zod schemas from AI-PIPELINE §3 with post-validation clamps |
| 3.3 | Analysis prompt files; single-pass path |
| 3.4 | Map-reduce path above ~5k tokens (not 60k — see `AI-PIPELINE.md` §3, the real binding constraint is Groq's 12k-tokens/minute rate limit, not the 128k context window) |
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

## M4 — Email and calendar export (no Google API)
**Estimate: half a day — shipped ahead of schedule, see below**

Originally scoped as Gmail `drafts.create` + Calendar `events.insert` via OAuth. Dropped:
Testing-mode refresh tokens expire every 7 days, and leaving Testing mode for a
restricted scope (`gmail.compose`) requires a paid third-party security assessment.
Neither is compatible with an always-free, always-on portfolio project. See
`PRODUCT-REQUIREMENTS.md` §10 and `docs/GAP-ANALYSIS.md` P0.1 for the full reasoning.

| # | Task | Status |
| --- | --- | --- |
| 4.1 | `lib/export/gmail.ts` — compose deep link (`mail.google.com/mail/?view=cm`), `mailto:` fallback, plain-text clipboard copy, over-length guard | Done |
| 4.2 | `lib/export/ics.ts` — RFC 5545 `.ics` builder (line folding, text escaping, all-day events), single and bulk download | Done |
| 4.3 | `EmailComposer` wired to "Open this in Gmail" / "Copy it instead" | Done |
| 4.4 | `TodoTable` wired to "Save the date" (single) / "Put all N dates in my calendar" (bulk) | Done |
| 4.5 | Settings page Google section reworded: no scopes requested beyond sign-in | Done |
| 4.6 | Marketing copy (hero, sections, FAQ) reworded to match | Done |

**Exit:** from a processed meeting, opening the Email tab and clicking through lands a
filled-in message in the user's own Gmail; downloading a to-do's date opens correctly in
Google Calendar, Outlook, and Apple Calendar. Zero Google Cloud project, zero OAuth
consent screen, zero verification, zero expiry.

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
| 5.10 | **Sentry SDK + error boundaries done** (`docs/GAP-ANALYSIS.md` P2.10, shipped early). Remaining: create the actual Sentry project and set `NEXT_PUBLIC_SENTRY_DSN` in Vercel — a deliberate manual step, same shape as the Groq console check. |
| 5.11 | Manual launch checklist (below) |
| 5.12 | README polish, production deploy, share the live link |

**Exit:** MVP live. All PRODUCT-REQUIREMENTS MVP features (F1-F15) shipped.

---

## Manual launch checklist

- [ ] Sign-in works in a clean browser profile, both themes
- [ ] Real 45-minute recording processes end to end
- [ ] Poor-audio recording degrades honestly rather than inventing content
- [ ] The no-clear-actions fixture produces zero action items
- [ ] "Open this in Gmail" opens a compose window with correct subject and body; nothing sends on its own
- [ ] Downloaded `.ics` opens correctly in Google Calendar, Outlook, and Apple Calendar with the right date
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
| M4 | 0.5 | 15.5 |
| M5 | 3-4 | 19.5 |

**~3-4 focused weeks to MVP.**

---

## Risk register

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | Groq free-tier limits tighten or the free tier ends | Medium | High | Provider abstraction in `server/controllers/`; Gemini fallback already implemented; browser-side Whisper via transformers.js documented as the escape hatch |
| R2 | `ffmpeg.wasm` fails on older or mobile browsers | Medium | Medium | Explicit fallback in M1.11; direct upload allowed under 20 MB; error copy tells the user how to compress |
| R3 | 60s Vercel limit exceeded by a slow chunk | Low | High | 10-minute chunks transcribe in 5-20s; if a chunk times out it retries with a 5-minute split |
| R4 | Supabase pauses after inactivity | Medium | Medium | Keep-alive cron every 3 days from M0 |
| R5 | Action-item quality below the trust threshold | Medium | High | Eval suite gates every prompt change; precision prioritized over recall; everything editable |
| R6 | ~~Google OAuth verification blocks growth past 100 users~~ Retired | — | — | M4 dropped OAuth for Gmail/Calendar entirely (see M4 note). Sign-in still uses Google OAuth, but only `email`/`profile` — unrestricted scopes, no verification required, no user cap |
| R7 | 1 GB storage exhausted | Medium | Medium | 7-day retention enforced by cron from M2; Opus transcode cuts size ~10x versus source |
| R8 | Hallucinated commitments damage trust | Low | High | Conservative prompt rules, null-owner default, "AI-inferred" badges, past-date nulling, zero-action fixture in the eval set |
| R9 | Scope creep into Phase 2 during MVP | High | Medium | PRODUCT-REQUIREMENTS §6 is the contract; anything not in F1-F15 is deferred without debate |
| R10 | Vercel Hobby forbids commercial use | Low | Medium | MVP is non-commercial. Monetization requires a paid plan; that is a deliberate later decision, not an accident |
