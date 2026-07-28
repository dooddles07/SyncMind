# SyncMind — Activity Log

Running record of decisions and work. Newest first. Not auto-committed.

---

## 2026-07-28 — ffmpeg threading locked + APP_URL wired to the live deploy

**Discovered mid-session:** Vercel was already connected, live at
`https://sync-mind-three.vercel.app/`. Confirmed by curling `/api/health` from the
previous commit — it returned a real deployed commit SHA, proving both prior commits
were already pushed and live. This retroactively resolves P2.6 from
`docs/GAP-ANALYSIS.md` ("not connected to Vercel yet") and unblocks the `APP_URL` repo
variable `keepalive.yml` was built to read but had nothing to point at.

**Done:**
- P0.4 locked, docs-only: `ARCHITECTURE.md` §3.4 and `ROADMAP.md` M1.7 now pin
  `@ffmpeg/core` (single-threaded) over `@ffmpeg/core-mt`, so the M1 chunker build
  doesn't default into needing site-wide COOP/COEP headers. No code changed — ffmpeg
  isn't installed yet, this only locks the decision before that work starts.
- `APP_URL` GitHub Actions repo variable set to the live URL, so `keepalive.yml`'s
  ping step does a real health check instead of no-op skipping. Triggered once
  manually to confirm end to end.
- `docs/GAP-ANALYSIS.md` updated: Deploy row now reflects the live URL, P0.4 marked
  resolved, suggested order of work re-sequenced now that P0.1/P0.2/P0.4/P2.6 are all
  done.

**Still open:** P0.5 (verify real Groq limits — needs the user's Groq console, not
blocking anything else). P2.1 (ESLint), P2.2 (`ci.yml`), P2.7 (README still claims
"Pre-build, no application code exists yet" — false).

**Next:** P2.1 + P2.2 + P2.7 are all small and fully actionable now.

---

## 2026-07-28 — Keepalive workflow (fixes GitHub's 60-day scheduled-workflow auto-disable)

**Done:** P0.2 from `docs/GAP-ANALYSIS.md`. GitHub disables `schedule:` workflows after
60 days with no repository *push* activity — a scheduled run doesn't count, only a
`git push` does. A finished portfolio project sees no pushes for 60+ days, so any
naive keepalive/sweep cron eventually goes silently dark, Supabase pauses next (7 idle
days), and the live link 500s for anyone who clicks it.

Added:
- `app/api/health/route.ts` — trivial health check, no secrets, no DB call yet (there
  is no DB). Returns status/timestamp/commit SHA. Extension point for P1: add a
  `select 1` once Supabase exists.
- `.github/workflows/keepalive.yml` — runs every 3 days. Pings `/api/health` via a
  repo variable `APP_URL` (no-ops with a log line if unset — not deployed yet). Then
  writes a timestamp to `.github/heartbeat` and commits + pushes it. **That commit is
  the actual fix** — it resets GitHub's 60-day clock regardless of deploy state, so it
  works today and keeps working forever untouched.
- `docs/DEPLOYMENT.md` §8 — documents setting `APP_URL` once Vercel is connected, plus
  a redundant cron-job.org pinger as a one-time manual step (independent failure
  domain from GitHub Actions).

**Still open:** `APP_URL` is unset until Vercel is connected (P2.6). `ci.yml` and
`sweep.yml` remain unbuilt — sweep needs the pipeline state machine (P1/M2), which
doesn't exist yet.

**Next:** P0.3 is now mechanically covered by the same workflow once `APP_URL` is set;
remaining P0 items are P0.4 (`ffmpeg.wasm` threading decision) and P0.5 (verify real
Groq limits).

---

## 2026-07-28 — Gap analysis + M4 rebuilt without Google APIs

**Done:** Full-repo gap scan (`docs/GAP-ANALYSIS.md`, new file) against the stated goal
of a live, $0, portfolio-ready deploy. Six P0 zero-cost-constraint breaks identified;
fixed the first one end to end.

**Decision: drop `gmail.compose` + `calendar.events` OAuth entirely.**

Reasoning: Google's Testing-mode refresh tokens expire every 7 days, and leaving
Testing mode for a restricted scope (`gmail.compose`) requires a paid third-party
security assessment — both incompatible with an always-free, always-on project nobody
is paid to babysit. Replaced with:

- `lib/export/gmail.ts` — Gmail compose deep link (`mail.google.com/mail/?view=cm`),
  `mailto:` fallback, plain-text clipboard copy, an over-length guard for Gmail's URL
  truncation.
- `lib/export/ics.ts` — hand-rolled RFC 5545 builder (75-octet line folding, `\,;`
  escaping, all-day `VEVENT`s), single and bulk download.

Wired into `EmailComposer` ("Open this in Gmail" / "Copy it instead") and `TodoTable`
("Save the date" / "Put all N dates in my calendar"); `Todo.onCalendar` retired since
there is no server state to track. Settings, marketing copy, and all six docs
(`PRODUCT-REQUIREMENTS`, `ROADMAP` M4, `ARCHITECTURE`, `DATA-MODEL`, `SECURITY-PRIVACY`,
`DEPLOYMENT`) updated to match, plus `.env.example` (dropped `GOOGLE_TOKEN_ENC_KEY`,
no longer needed with no token to encrypt). Verified with Playwright: compose link
builds correctly, downloaded `.ics` parses as valid RFC 5545, no console errors.

Google sign-in itself is unaffected and unaffected by any of this — `email`/`profile`
are unrestricted scopes, ship straight to Production, no verification, no user cap.

**Next:** P0.2 (GitHub Actions cron dies after 60 days idle) or P0.4 (`ffmpeg.wasm`
threading decision) — see `docs/GAP-ANALYSIS.md` for the full list, ordered.

---

## 2026-07-28 — Planning session

**Done:** Full pre-build documentation set created. No application code written.

**Decisions locked:**

| Decision | Choice | Reasoning |
| --- | --- | --- |
| Transcription | Groq `whisper-large-v3-turbo` | Fastest free ASR with segment timestamps. Alternatives considered: browser-side transformers.js (unlimited but slow on weak devices, large model download), Gemini audio input (simpler pipeline but tighter free limits). |
| Backend | Supabase free tier | Postgres + Auth + Storage + RLS in one product. Alternatives: Neon + Auth.js (no bundled storage), local-first IndexedDB (no sync, no calendar, no sharing). |
| Integrations | Google OAuth — Calendar events + Gmail **drafts** | `gmail.compose` rather than `gmail.send` so the app is technically incapable of sending on the user's behalf. |
| Hosting | Vercel Hobby | Free, first-class Next.js. Accepts the 60s function cap and non-commercial terms. |
| LLM | Groq `llama-3.3-70b-versatile`, Gemini `2.0-flash` fallback | Structured extraction quality at zero cost, with a second provider for outages and daily-limit exhaustion. |
| Background work | Client-driven poll + short `advance` calls | No free always-on worker exists. State lives in Postgres, so work is resumable rather than lost. |
| Retention | 7-day audio auto-purge, user-adjustable 1-30 | 1 GB storage cap makes this a product policy, not a hidden job. |

**Files created:**
- `README.md`
- `docs/PRODUCT-REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA-MODEL.md`
- `docs/AI-PIPELINE.md`
- `docs/DESIGN-SYSTEM.md`
- `docs/ROADMAP.md`
- `docs/DEPLOYMENT.md`
- `docs/SECURITY-PRIVACY.md`
- `docs/ACTIVITY-LOG.md`
- `.gitignore`, `.env.example`

**Open items to resolve before or during M0:**
1. Confirm the Groq free-tier limits as published at build time (`console.groq.com` → Settings → Limits, per model) and tune the `GROQ_DAILY_*` defaults to match — **not conservative estimates, verify directly.** Third-party trackers checked 2026-07-28 suggest `llama-3.3-70b-versatile` free tier may be closer to ~1,000 req/day with a per-minute token cap in the low tens of thousands — much tighter than the current `GROQ_DAILY_LLM_TOKENS=400000` placeholder, and possibly tight enough that a single analysis call brushes the per-minute limit. See AI-PIPELINE §7 for the required tuning steps. Unconfirmed — official Groq console is the only trustworthy source, third-party pages are not authoritative.
2. Verify `whisper-large-v3-turbo` and `llama-3.3-70b-versatile` are still the current ids on the Groq models endpoint.
3. **Decided:** production domain is the Vercel-provided subdomain (`*.vercel.app`). No custom domain — that carries an annual registration cost, which breaks the $0 constraint. Not revisited unless the constraint itself is dropped.
4. **Decided:** GitHub repo stays **public**. GitHub Actions minutes are free and unlimited on public repos; a private repo caps free Actions minutes and could eventually push the keep-alive/sweep crons toward a paid tier. No private-data risk since the app has no secrets or user data in the repo (SECURITY-PRIVACY §9).

**Next:** M0 in `docs/ROADMAP.md` — repo init, Next.js scaffold, Supabase project, migrations, CI.

---
