# SyncMind — Setup and Deployment

Everything here is free. No payment method is required at any step.

## 1. Accounts

| Service | URL | Plan | What it gives us |
| --- | --- | --- | --- |
| GitHub | github.com | Free | Repo `dooddles07/SyncMind` — **must stay public**, Actions for cron |
| Supabase | supabase.com | Free | Postgres 500 MB, Auth, Storage 1 GB, 50k MAU |
| Groq | console.groq.com | Free | Whisper ASR + Llama LLM, rate-limited |
| Google Cloud | console.cloud.google.com | Free | OAuth client for sign-in only — no Gmail/Calendar API |
| Vercel | vercel.com | Hobby | Hosting, 100 GB bandwidth, 60s functions |
| Google AI Studio | aistudio.google.com | Free | Gemini fallback key |
| Sentry (optional) | sentry.io | Developer | 5k errors/month |

Known ceilings to respect: Vercel Hobby is non-commercial and caps functions at 60s, 100 GB bandwidth/month, 100 build minutes/month. Supabase pauses a project after 7 days of no activity and caps free accounts at 2 active projects. Groq free tier is rate-limited per day and per model and caps audio uploads at 25 MB per request — confirm exact per-model numbers at `console.groq.com` before tuning quotas (see AI-PIPELINE §7). GitHub Actions minutes are free and unlimited only while the repo stays **public**.

No Google OAuth consent-screen verification is needed: sign-in requests only `email`/`profile`, which are unrestricted scopes and ship straight to Production with no review and no user cap. `gmail.compose` and `calendar.events` are not requested at all — see §5.

## 2. Environment variables

Copy `.env.example` to `.env.local` for local work; set the same keys in Vercel for Preview and Production.

| Variable | Where to get it | Exposure |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public | client |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role | **server only** |
| `GROQ_API_KEY` | console.groq.com → API Keys | **server only** |
| `GEMINI_API_KEY` | aistudio.google.com → Get API key | **server only** |
| `GOOGLE_CLIENT_ID` | Cloud Console → Credentials → OAuth client | server |
| `GOOGLE_CLIENT_SECRET` | same | **server only** |
| `CRON_SECRET` | `openssl rand -hex 32` | **server only** |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` / your Vercel URL | client |
| `GROQ_DAILY_AUDIO_SECONDS` | default `21600` | server |
| `GROQ_DAILY_ASR_CALLS` | default `60` | server |
| `GROQ_DAILY_LLM_CALLS` | default `80` | server |
| `GROQ_DAILY_LLM_TOKENS` | default `400000` | server |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry project settings (optional) | client — a DSN isn't a secret, Sentry's own docs confirm it's meant to be embedded client-side |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | Sentry org/project settings (optional, for source-map upload) | **build-time only**, never in client code |

Only `NEXT_PUBLIC_*` variables may appear in client code. A server-only key referenced from a `"use client"` file is a shipped secret — CI greps for this and fails the build.

## 3. Supabase

1. New project. Pick the region closest to your users. Save the database password.
2. Install the CLI: `npm i -g supabase`. Then `supabase login` and `supabase link --project-ref <ref>`.
3. Apply migrations:

```bash
supabase db push
```

4. Create the `recordings` bucket as **private** (Storage → New bucket), then apply the storage policies from DATA-MODEL §5.
5. Verify RLS is enabled on every table: Database → Tables → each table shows "RLS enabled". A table without it is a data leak.
6. Generate types after every migration:

```bash
supabase gen types typescript --linked > lib/supabase/types.ts
```

### Google sign-in

Authentication → Providers → Google → enable. Paste `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (from §5). Copy the callback URL Supabase shows — it goes into the Google credential's authorized redirect URIs.

Authentication → URL Configuration → Site URL = your production URL. Add `http://localhost:3000/**` and your Vercel preview pattern to Redirect URLs.

## 4. Groq

console.groq.com → API Keys → Create. Copy immediately; it is shown once.

Verify:

```bash
curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"
```

The response must list `whisper-large-v3-turbo` and `llama-3.3-70b-versatile`. If a model id is missing, update `lib/ai/models.ts` rather than working around it at call sites.

## 5. Google Cloud (sign-in only)

No Gmail API, no Calendar API, no restricted or sensitive scopes. Follow-up emails
use a Gmail compose deep link (`mail.google.com/mail/?view=cm`); calendar entries are
a downloadable `.ics` file. Neither touches a Google API, so neither needs this section.
See `docs/GAP-ANALYSIS.md` P0.1 for why that path was dropped.

1. Create a project named `SyncMind`.
2. OAuth consent screen → External. **Publish to Production** — the scopes below are
   unrestricted, so this needs no Google review and has no user cap.
   - App name `SyncMind`, support email, developer email.
3. Scopes — request exactly these, nothing more:

```
openid
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

4. Credentials → Create OAuth client ID → Web application.
   - Authorized JavaScript origins: `http://localhost:3000`, `https://<your-app>.vercel.app`
   - Authorized redirect URIs: the Supabase callback URL only.

## 6. Local development

```bash
git clone https://github.com/dooddles07/SyncMind.git && cd SyncMind && npm install && cp .env.example .env.local
```

Fill `.env.local`, then:

```bash
npm run dev
```

Scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev` | dev server on :3000 |
| `npm run build` | production build; must pass before pushing |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit + integration |
| `npm run test:e2e` | Playwright |
| `npm run eval` | AI quality eval against fixtures |
| `npm run db:types` | regenerate Supabase types |

`ffmpeg.wasm` requires cross-origin isolation. `next.config.ts` sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. If audio processing silently fails locally, this header pair is the first thing to check.

## 7. Vercel

1. Import the GitHub repo. Framework preset: Next.js. Defaults are correct.
2. Settings → Environment Variables → add everything from §2 for Production, Preview, and Development.
3. Deploy. `main` is production; every PR gets a preview URL.
4. After the first deploy, set `NEXT_PUBLIC_APP_URL` to the real URL and add it to the Supabase redirect list and the Google authorized origins.

Function configuration in `vercel.json`:

```json
{
  "functions": {
    "app/api/pipeline/advance/route.ts": { "maxDuration": 60 },
    "app/api/cron/sweep/route.ts":       { "maxDuration": 60 }
  }
}
```

Do not use Vercel Cron — Hobby allows only daily jobs and we need the keep-alive on a 3-day rhythm plus a daily sweep. GitHub Actions handles both and stays free.

## 8. Scheduled jobs

`.github/workflows/keepalive.yml` — every 3 days, `curl`s `${{ vars.APP_URL }}/api/health` (a repo **variable**, not a secret — it's just the public URL) if that variable is set, then writes a timestamp to `.github/heartbeat` and commits + pushes it.

That commit is the actual fix, not the ping. GitHub disables `schedule:` workflows after 60 days of repository *push* inactivity — a scheduled run by itself does not count as activity. The heartbeat commit resets that clock every 3 days regardless of whether the app is deployed, so this works today, before Vercel is even connected, and keeps working forever without anyone touching the repo.

**After connecting Vercel** (§7): add a repo variable `APP_URL` (Settings → Secrets and variables → Actions → Variables tab) set to your production URL, e.g. `https://syncmind.vercel.app`. Until then the ping step logs a skip message and only the heartbeat runs.

**Redundant pinger (do this once, after Vercel is connected):** sign up free at [cron-job.org](https://cron-job.org) (no card), create a job that `GET`s `https://<your-app>.vercel.app/api/health` every 3 days. This is deliberately a second, independent service — a GitHub Actions outage or an account issue on this repo doesn't take down the only thing keeping Supabase awake.

`.github/workflows/sweep.yml` — daily at 03:00 UTC, POST `/api/cron/sweep` with `Authorization: Bearer ${{ secrets.CRON_SECRET }}`. The sweep advances meetings stuck in a non-terminal state for over 10 minutes and purges audio past its retention window. **Not built yet** — it depends on the pipeline state machine (`docs/ROADMAP.md` M2), which doesn't exist in the codebase yet. `/api/cron/sweep` will reject any request without a matching `CRON_SECRET` bearer token once it exists.

## 9. Staying at zero cost

| Signal | Where | Action |
| --- | --- | --- |
| Storage above 700 MB | Supabase → Storage | Reduce default `retention_days` to 3 |
| Database above 350 MB | Supabase → Database | Archive transcripts older than a year |
| Groq 429s appearing | app logs | Lower the `GROQ_DAILY_*` ceilings |
| Vercel bandwidth above 70 GB | Vercel → Usage | Confirm audio is not being proxied through a route handler |
| MAU approaching 50k | Supabase → Auth | Not a realistic MVP concern |

Check monthly. The single most likely way to leave the free tier is proxying audio through Vercel instead of using signed URLs — the architecture avoids this and any change that reintroduces it should be rejected in review.

## 10. Rollback

- **Bad deploy:** Vercel → Deployments → previous → Promote to Production. Instant.
- **Bad migration:** write a new forward migration that reverses it. Never edit an applied migration. Supabase free tier has no point-in-time recovery, so take a `supabase db dump` before any destructive migration.
- **Leaked key:** rotate at the provider, update Vercel env vars, redeploy. For `SUPABASE_SERVICE_ROLE_KEY`, rotate in Supabase and treat the exposure window as a data incident per SECURITY-PRIVACY §6.

## 11. Post-deploy verification

- [ ] `/api/health` returns 200 and touches the database
- [ ] Google sign-in completes and a `profiles` row is created
- [ ] Upload a 2-minute fixture; it reaches `ready`
- [ ] Transcript timestamps seek the audio correctly
- [ ] "Open this in Gmail" opens a filled-in compose window; Gmail Sent stays empty
- [ ] Downloaded `.ics` event lands on the correct date when opened in a calendar app
- [ ] A second account gets 404 on the first account's meeting URL
- [ ] Share link works signed-out; revoke returns 404
- [ ] Both keep-alive and sweep workflows run green when triggered manually
- [ ] Supabase, Groq, Vercel dashboards all show $0
