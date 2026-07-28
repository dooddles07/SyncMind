# SyncMind — Gap Analysis

Scan date: 2026-07-28. Scope: whole repo + docs vs "live, working, $0 personal portfolio project".

Verified by reading: 68 tracked files, `npm run build` (passes), `npm run typecheck` (passes), git remote, all `href` targets, all component state.

---

## 0. Where the project actually stands

| Layer | State |
| --- | --- |
| UI / design system | Done and good. 9 routes build, Room Tone tokens, motion, dark mode, a11y skip link. |
| Data | 100% fixtures in `lib/mock/data.ts` behind async getters. |
| Backend | Does not exist. No `app/api/**`, no `lib/supabase/**`, no `supabase/migrations/**`. |
| Auth | Does not exist. No `middleware.ts`, no session, no route protection. |
| AI | Does not exist. No Groq/Gemini client, no `lib/quota.ts`, no prompts. |
| Integrations | Resolved — no OAuth needed. `lib/export/gmail.ts` + `lib/export/ics.ts`. |
| CI / cron | `ci.yml` and `keepalive.yml` done. `sweep.yml` still missing (needs P1). |
| Tests | Do not exist. No runner installed. |
| Deploy | Repo pushed to `github.com/dooddles07/SyncMind`. **Vercel connected and live** at [sync-mind-three.vercel.app](https://sync-mind-three.vercel.app/) — confirmed via `/api/health`. |

Roughly: M0 partially done, M1 UI-only, M2-M5 not started.

---

## P0 — Zero-cost constraint breaks. Decide these before writing backend code.

These invalidate parts of the documented plan. Each has a $0 answer, but the plan has to change.

### P0.1 — Google OAuth Testing mode expires refresh tokens every 7 days — **Resolved**

`lib/export/gmail.ts` + `lib/export/ics.ts` replace `gmail.compose`/`calendar.events`. See `docs/ACTIVITY-LOG.md` 2026-07-28.

`docs/ROADMAP.md` M4 and `DEPLOYMENT.md` §1 accept "Testing mode, 100 users" as fine for MVP. It is not fine for the token model. With an External consent screen in **Testing** publishing status, Google expires refresh tokens after **7 days**. Every user (including you, the portfolio owner) must re-consent weekly or Gmail drafts and Calendar inserts start failing with `invalid_grant`.

Escaping Testing mode is not free either: `gmail.compose` is a **restricted** scope, and publishing an app with restricted scopes requires Google verification plus a third-party security assessment — a recurring four-to-five-figure cost. `calendar.events` is a sensitive scope, cheaper to verify but still a manual review with a privacy policy and demo video.

**Recommendation — drop the OAuth path entirely for MVP and ship the zero-OAuth equivalents:**

| Feature | OAuth version (breaks weekly, costs money to fix) | $0 version (never expires, no API, no consent screen) |
| --- | --- | --- |
| Follow-up email | `gmail.drafts.create` | Gmail compose deep link `https://mail.google.com/mail/?view=cm&to=…&su=…&body=…` plus copy-to-clipboard |
| Calendar entries | `calendar.events.insert` | `.ics` file download (one event or a bundle), opens in Google Calendar / Outlook / Apple Calendar |

`ROADMAP.md` R6 already names these as the fallback. Promote them to the primary path. M4 shrinks from 2-3 days to a few hours, the honesty story stays intact ("SyncMind cannot send mail" becomes literally true — there is no mail code at all), and the settings screen's Google section becomes a much simpler export section. Keep OAuth as a documented Phase-2 item.

**If you insist on real Gmail drafts:** accept and surface the 7-day reconnect in the UI, and add a "Reconnect Google" state to Settings driven by a stored `refresh_token_issued_at`.

### P0.2 — GitHub Actions cron dies after 60 days of repo inactivity — **Resolved**

`.github/workflows/keepalive.yml` + `app/api/health/route.ts`. Self-commits a heartbeat every 3 days regardless of deploy state, so the 60-day clock never reaches zero. `docs/DEPLOYMENT.md` §8 documents the cron-job.org redundant pinger as a one-time manual step once Vercel is connected. See `docs/ACTIVITY-LOG.md` 2026-07-28.

M0.9 keepalive and M2.11 sweep both rely on `schedule:` workflows. GitHub **disables scheduled workflows after 60 days without repository activity**, and emails the owner. On a finished portfolio project you will not push for 60 days. Then keepalive stops, then Supabase pauses (P0.3), then the live demo 500s for anyone who clicks your portfolio link.

**Fix (pick both, they are complementary):**
- Have the keepalive workflow itself commit a heartbeat (e.g. append a line to a `.github/heartbeat` file) so the repo is never inactive.
- Add a second, independent pinger: a free `cron-job.org` job hitting `/api/health` every 3 days. Redundancy costs nothing.

### P0.3 — Supabase free project pauses after 7 idle days

Already in `ARCHITECTURE.md` §1, but the consequence for a *portfolio* is sharper than for a product: a paused project means a recruiter clicking your link gets a broken app, and restore is a manual dashboard click. P0.2's mechanism is in place; still blocked on Supabase not existing yet (P1) and Vercel not being connected (P2.6) — `APP_URL` repo variable is unset until then, so the health ping currently no-ops.

Also confirm at signup time: free tier caps you at 2 active projects, so do not burn one on a throwaway.

### P0.4 — `ffmpeg.wasm` needs cross-origin isolation headers that `next.config.ts` does not set — **Resolved (decision locked)**

Single-threaded chosen, documented in `ARCHITECTURE.md` §3.4 and `ROADMAP.md` M1.7. No code changes yet — there's no ffmpeg dependency or chunker to change, this only prevents the M1 build from defaulting to the wrong package. See `docs/ACTIVITY-LOG.md` 2026-07-28.

[next.config.ts](next.config.ts) is four lines and sets no headers. The multithreaded `@ffmpeg/core-mt` build needs `SharedArrayBuffer`, which needs `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` on the document. Turning those on site-wide breaks any cross-origin resource that does not send CORP headers.

**Decision needed before M1.7.** Two $0 options:
- Single-threaded `@ffmpeg/core` — no headers, no isolation risk, roughly 2-4x slower transcode. Fine for a 45-minute file on a laptop, slow on mobile.
- Multithreaded — add the two headers scoped to `/upload` only via `headers()` in `next.config.ts`, and verify nothing on that route loads a cross-origin asset.

Recommend single-threaded for MVP; revisit only if transcode time is the actual complaint.

### P0.5 — Groq model ids and free limits are unverified placeholders

Already open item #1-2 in [ACTIVITY-LOG.md](ACTIVITY-LOG.md). `GROQ_DAILY_LLM_TOKENS=400000` in [.env.example](../.env.example) is a guess, and `llama-3.3-70b-versatile` may have been deprecated. A wrong ceiling means either a 429 in front of a recruiter or an unnecessarily crippled demo.

Do this before M2: `curl https://api.groq.com/openai/v1/models` with your key, then read console → Settings → Limits per model, then write the real numbers into the env defaults and log them.

### P0.6 — Vercel Hobby is non-commercial

Fine for a portfolio, which is the stated framing. Flagging only so it stays a conscious constraint: the moment this project takes money, Hobby is a terms violation. `ROADMAP.md` R10 already says this.

---

## P1 — Blocks "it actually works". This is the build.

Ordered as a build sequence; each item is a real dependency of the next.

| # | Gap | Why it blocks |
| --- | --- | --- |
| 1.1 | No Supabase project, no `supabase/migrations/**` | Nothing can persist. `DATA-MODEL.md` has the schema; none of it is applied. |
| 1.2 | No `lib/supabase/{client,server,admin}.ts`, no generated `types.ts` | Every page still imports `lib/mock/data`. |
| 1.3 | No auth: no Google sign-in, no `middleware.ts`, no `/auth/callback` | `/dashboard`, `/settings`, `/tasks`, `/meetings/[id]` are all publicly reachable and always will be until middleware exists. |
| 1.4 | No `app/api/**` at all | `POST /api/meetings`, `POST /api/pipeline/advance`, `GET /api/meetings/:id/status`, `/api/pipeline/retry`, `/api/health` — none exist. |
| 1.5 | No `lib/quota.ts` | Referenced by `CLAUDE.md` and `ARCHITECTURE.md`. Without it the first heavy day hits a raw upstream 429 instead of the designed `quota_blocked` state. |
| 1.6 | No AI layer: no Groq client, no `lib/ai/structured.ts`, no Zod schemas, no prompt files | Zod is not even a dependency yet. |
| 1.7 | No `ffmpeg.wasm` worker, no chunker | `@ffmpeg/ffmpeg` is not in `package.json`. This is the single largest unbuilt client-side piece. |
| 1.8 | [components/app/dropzone.tsx:29](../components/app/dropzone.tsx#L29) is a fake uploader | `start()` runs a `setInterval` for six ticks, never reads the file bytes, then hardcodes `router.push("/meetings/q3-planning")`. Any file, any size, any format "succeeds". |
| 1.9 | Mock getters ignore their id argument | `getTranscript(_meetingId)`, `getSpeakers`, `getNotes`, `getEmailDraft`, `getAskHistory` all return the Q3 fixture. Open "Northwind kickoff call" and you read the Q3 planning transcript. Visible today, not just after the swap. |
| 1.10 | [app/share/[token]/page.tsx:16](<../app/share/[token]/page.tsx#L16>) ignores its token | Hardcoded to `q3-planning`. `/share/anything` renders the same private notes. Harmless with fixtures, a data leak the day it is real. |
| 1.11 | Dead buttons | "Share a read-only link" (meeting page), "Disconnect Google" and "Delete all my data" (settings) have no `onClick`. |
| 1.12 | Hardcoded fake identity | Settings shows "Maya Osei / maya@example.com". Must come from the session. |
| 1.13 | Client state does not persist | `TodoTable`, `EmailComposer`, `AskPanel`, `RetentionSlider`, `TodoBoard` are all local `useState`. Refresh loses everything. Needs server actions or route handlers. |

---

## P2 — Blocks "live and trustworthy". Cheap, high leverage for a portfolio.

| # | Gap | Fix |
| --- | --- | --- |
| 2.1 | `npm run lint` is broken — script says `next lint`, no ESLint installed, no config | Install `eslint` + `eslint-config-next` and add `eslint.config.mjs`. Note `next lint` is deprecated in Next 15 and gone in 16; move to the ESLint CLI directly. |
| 2.2 | ~~No CI~~ **Resolved** | `.github/workflows/ci.yml`: typecheck + build on every push/PR. Lint step waits on 2.1 (ESLint not installed yet); unit step waits on 2.9 (no test runner). |
| 2.3 | `keepalive.yml` **done** / `sweep.yml` still missing | See P0.2/P0.3. `sweep.yml` needs the pipeline state machine (P1/M2), not built yet. |
| 2.4 | No error/not-found UI | Missing `app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`, `app/loading.tsx`. A thrown error today shows the raw Next.js default. |
| 2.5 | No OG image, no `robots.ts`, no `sitemap.ts`, no `manifest.ts` | For a portfolio link this is the highest-visibility gap on the list. Pasting the URL into LinkedIn/X/Discord currently previews as a bare title. `opengraph-image.tsx` with `next/og` is free and static. |
| 2.6 | No Vercel project connected | No `.vercel` directory. Nothing is deployed, so there is no link to put on the portfolio. |
| 2.7 | README is wrong on its own front page | Says "Pre-build. Planning documents are complete; no application code exists yet" — false. Links `docs/DESIGN-SYSTEM.md`, which was deleted in db30f31 — a 404 on the repo homepage. |
| 2.8 | `ROADMAP.md` M0.4 and M5 still reference the deleted DESIGN-SYSTEM doc | Repoint to `app/globals.css`. |
| 2.9 | No tests | Vitest for the chunker offset math and `lib/types.ts` helpers (`isOverdue`, `formatTimecode`) is the minimum credible coverage; Playwright for the upload → ready happy path. |
| 2.10 | No error monitoring | Sentry free tier, or skip it and rely on Vercel runtime logs (also $0, less useful). |

---

## P3 — After it is live.

- Accessibility pass: contrast on all three semantic tones, focus order, full keyboard path, screen-reader labels (ROADMAP 5.7).
- Responsive verification at 375 / 768 / 1024 / 1440 (ROADMAP 5.8).
- Export paths: Markdown, print stylesheet for PDF, `.srt` / `.txt` transcript, `.ics` (the `.ics` piece is promoted to P0.1).
- Real share-link creation with revoke.
- Hard delete verified against the Supabase dashboard.
- Eval fixture set and `npm run eval`.
- Analytics: Vercel Web Analytics has a free Hobby tier; confirm the current event cap before wiring.

---

## Zero-cost stack — final verdict

| Service | Verdict | Condition |
| --- | --- | --- |
| Vercel Hobby | Keep | Non-commercial only. Design stays inside 60s functions. |
| Supabase Free | Keep | Keepalive must be redundant (P0.2). 2 projects max. |
| Groq | Keep | Verify real per-model limits before tuning quota (P0.5). |
| Gemini (AI Studio) | Keep | Fallback provider, free tier. |
| GitHub Actions | Keep | Public repo only. Heartbeat commit required (P0.2). |
| Google OAuth / Gmail / Calendar | **Drop for MVP** | Restricted scope verification is not free; Testing mode expires tokens weekly. Replace with compose deep link + `.ics`. |
| cron-job.org | **Add** | Free redundant pinger. |
| Sentry | Optional | Free developer tier. |
| Custom domain | Already rejected | Annual cost. `*.vercel.app` stands. |

Nothing in the recommended stack requires a payment method at any step.

---

## Suggested order of work

1. ~~P0 decisions~~ **Done** — P0.1 (OAuth drop), P0.2 (keepalive heartbeat), P0.4 (ffmpeg threading locked) shipped 2026-07-28. Only P0.5 (verify real Groq limits — needs your Groq console) remains, and it's not blocking anything else.
2. ~~P2.6 connect Vercel~~ **Already done**, discovered mid-session — live at [sync-mind-three.vercel.app](https://sync-mind-three.vercel.app/).
3. ~~P2.2~~ **Done** — `ci.yml` shipped. P2.7 + P2.1 — fix the remaining stale README claims, add ESLint (then wire it into `ci.yml`'s lint step). Small, fully actionable now.
4. P2.5 OG image + error pages — the demo now looks finished when shared, and it already has a real URL to share.
5. P1.1 → P1.13 in order — the real build, M1 through M3.
6. P3.
