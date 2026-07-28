# SyncMind — Activity Log

Running record of decisions and work. Newest first. Not auto-committed.

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
1. Confirm the Groq free-tier daily limits as published at build time and tune the `GROQ_DAILY_*` defaults to match. The values in AI-PIPELINE §7 are conservative estimates.
2. Verify `whisper-large-v3-turbo` and `llama-3.3-70b-versatile` are still the current ids on the Groq models endpoint.
3. Decide the production domain. Vercel subdomain is fine for MVP; a custom domain is a small annual cost outside the zero-cost constraint.

**Next:** M0 in `docs/ROADMAP.md` — repo init, Next.js scaffold, Supabase project, migrations, CI.

---
