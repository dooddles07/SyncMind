# SyncMind — Data Model

Postgres on Supabase. Every table carries `user_id` and is protected by Row Level Security; RLS is the authorization boundary, not the application layer.

## 1. Entity relationships

```mermaid
erDiagram
    profiles ||--o{ meetings : owns
    profiles ||--o{ usage_daily : accrues
    meetings ||--o{ audio_chunks : "split into"
    meetings ||--o{ transcript_segments : produces
    meetings ||--o| summaries : produces
    meetings ||--o{ action_items : produces
    meetings ||--o| email_drafts : produces
    meetings ||--o{ share_links : exposes
    meetings ||--o{ ask_queries : answers
    transcript_segments ||--o{ action_items : "sourced from"
```

## 2. Enums

```sql
create type meeting_status as enum (
  'draft', 'uploading', 'transcribing', 'analyzing',
  'ready', 'failed', 'quota_blocked'
);

create type chunk_status as enum ('pending', 'uploaded', 'processing', 'done', 'failed');

create type action_status as enum ('todo', 'in_progress', 'done');

create type action_priority as enum ('low', 'medium', 'high');

create type email_tone as enum ('professional', 'friendly', 'brief');
```

## 3. Schema

### profiles

Mirrors `auth.users`, created by trigger on signup.

```sql
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  avatar_url    text,
  default_tone  email_tone not null default 'professional',
  retention_days smallint not null default 7 check (retention_days between 1 and 30),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

```sql
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email,
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

### meetings

```sql
create table meetings (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  title          text not null,
  meeting_date   date not null default current_date,
  duration_sec   integer not null check (duration_sec > 0 and duration_sec <= 7200),
  status         meeting_status not null default 'draft',
  stage_detail   text,
  error_code     text,
  error_message  text,
  resume_at      timestamptz,          -- set when quota_blocked
  chunk_count    smallint not null check (chunk_count between 1 and 24),
  language       text not null default 'en',
  pinned         boolean not null default false,  -- exempt from audio purge
  audio_purged_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index meetings_user_created_idx on meetings (user_id, created_at desc);
create index meetings_active_idx on meetings (status, updated_at)
  where status in ('uploading','transcribing','analyzing','quota_blocked');
create index meetings_purge_idx on meetings (created_at)
  where audio_purged_at is null and pinned = false;
```

`meetings_active_idx` is what the stalled-meeting sweep scans. `meetings_purge_idx` is what the retention job scans.

### audio_chunks

```sql
create table audio_chunks (
  id            uuid primary key default gen_random_uuid(),
  meeting_id    uuid not null references meetings(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  chunk_index   smallint not null,
  start_sec     integer not null,      -- offset of this chunk within the meeting
  duration_sec  integer not null,
  storage_path  text not null,
  size_bytes    integer,
  status        chunk_status not null default 'pending',
  attempts      smallint not null default 0,
  last_error    text,
  created_at    timestamptz not null default now(),
  unique (meeting_id, chunk_index)
);

create index audio_chunks_next_idx on audio_chunks (meeting_id, chunk_index)
  where status in ('uploaded','failed');
```

### transcript_segments

Timestamps are **absolute within the meeting** — Whisper returns chunk-relative values and the pipeline adds `audio_chunks.start_sec` before insert.

```sql
create table transcript_segments (
  id            bigint generated always as identity primary key,
  meeting_id    uuid not null references meetings(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  chunk_index   smallint not null,
  seq           integer not null,       -- ordering within the meeting
  start_sec     numeric(9,2) not null,
  end_sec       numeric(9,2) not null,
  speaker       text,                   -- 'Speaker 1' or a resolved name
  text          text not null,
  created_at    timestamptz not null default now(),
  unique (meeting_id, seq)
);

create index transcript_meeting_seq_idx on transcript_segments (meeting_id, seq);
create index transcript_fts_idx on transcript_segments
  using gin (to_tsvector('english', text));
```

Full-text search within a meeting:

```sql
select id, seq, start_sec, speaker, text
from transcript_segments
where meeting_id = $1
  and to_tsvector('english', text) @@ plainto_tsquery('english', $2)
order by seq;
```

### summaries

One row per meeting. Structured lists live in JSONB so the UI can render and edit them without a table per concept, while `*_md` holds the user-edited rendering that exports use.

```sql
create table summaries (
  meeting_id      uuid primary key references meetings(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  overview        text not null,
  topics          jsonb not null default '[]',
  -- [{ "title": str, "points": [str], "atSec": num }]
  decisions       jsonb not null default '[]',
  -- [{ "text": str, "atSec": num }]
  open_questions  jsonb not null default '[]',
  -- [{ "text": str, "atSec": num }]
  attendees       jsonb not null default '[]',
  -- [{ "name": str, "speakerLabel": str }]
  edited_by_user  boolean not null default false,
  model           text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
```

### action_items

```sql
create table action_items (
  id            uuid primary key default gen_random_uuid(),
  meeting_id    uuid not null references meetings(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  title         text not null,
  detail        text,
  owner_name    text,
  due_date      date,
  priority      action_priority not null default 'medium',
  status        action_status not null default 'todo',
  source_sec    numeric(9,2),
  source_segment_id bigint references transcript_segments(id) on delete set null,
  ai_generated  boolean not null default true,
  edited_by_user boolean not null default false,
  position      integer not null default 0,   -- kanban ordering
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index action_items_board_idx on action_items (user_id, status, position);
create index action_items_due_idx on action_items (user_id, due_date)
  where status <> 'done' and due_date is not null;
create index action_items_meeting_idx on action_items (meeting_id);
```

Calendar delivery is a client-generated `.ics` download (`lib/export/ics.ts`), not a
Calendar API call, so there is no server-side event id to track and no double-create
to prevent — downloading the same to-do twice just re-downloads the same file.

### email_drafts

```sql
create table email_drafts (
  meeting_id      uuid primary key references meetings(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  subject         text not null,
  body_md         text not null,
  tone            email_tone not null default 'professional',
  recipients      jsonb not null default '[]',   -- [str] email addresses
  edited_by_user  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
```

No `gmail_draft_id` — the composer builds a Gmail deep link client-side
(`lib/export/gmail.ts`) from these columns, it does not call the Gmail API.

### share_links

```sql
create table share_links (
  token             text primary key,   -- 32-byte base64url, generated app-side
  meeting_id        uuid not null references meetings(id) on delete cascade,
  user_id           uuid not null references profiles(id) on delete cascade,
  include_transcript boolean not null default false,
  view_count        integer not null default 0,
  expires_at        timestamptz,        -- null = no expiry
  revoked_at        timestamptz,
  created_at        timestamptz not null default now()
);

create index share_links_meeting_idx on share_links (meeting_id);
```

No `google_connections` table. SyncMind never holds a Google access or refresh
token — sign-in is Supabase Auth's own OAuth flow, and Gmail/Calendar are reached
through a compose link and a downloaded file, not an authenticated API call. See
`SECURITY-PRIVACY.md` §4.

Access tokens are never stored — they are exchanged per request and held in memory only.

### ask_queries

Kept for rate limiting and so a user can revisit prior answers.

```sql
create table ask_queries (
  id          uuid primary key default gen_random_uuid(),
  meeting_id  uuid not null references meetings(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  question    text not null,
  answer      text not null,
  citations   jsonb not null default '[]',   -- [{ "segmentId": num, "atSec": num }]
  created_at  timestamptz not null default now()
);

create index ask_queries_rate_idx on ask_queries (user_id, created_at desc);
```

### usage_daily

```sql
create table usage_daily (
  user_id         uuid not null references profiles(id) on delete cascade,
  day             date not null default current_date,
  audio_seconds   integer not null default 0,
  llm_calls       integer not null default 0,
  llm_tokens      integer not null default 0,
  asr_calls       integer not null default 0,
  primary key (user_id, day)
);
```

Incremented atomically:

```sql
insert into usage_daily (user_id, day, audio_seconds, asr_calls)
values ($1, current_date, $2, 1)
on conflict (user_id, day) do update
set audio_seconds = usage_daily.audio_seconds + excluded.audio_seconds,
    asr_calls     = usage_daily.asr_calls + excluded.asr_calls;
```

## 4. Row Level Security

Enable on every table:

```sql
alter table profiles            enable row level security;
alter table meetings            enable row level security;
alter table audio_chunks        enable row level security;
alter table transcript_segments enable row level security;
alter table summaries           enable row level security;
alter table action_items        enable row level security;
alter table email_drafts        enable row level security;
alter table share_links         enable row level security;
alter table ask_queries         enable row level security;
alter table usage_daily         enable row level security;
```

Owner-only access, applied uniformly:

```sql
create policy "own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Repeat this shape for: meetings, audio_chunks, transcript_segments,
-- summaries, action_items, email_drafts, share_links,
-- ask_queries, usage_daily.
create policy "own rows" on meetings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

Notes:

- Every child table stores `user_id` directly rather than joining through `meetings`. It costs one column and removes a subquery from every policy check.
- **The public share page does not use the anon key.** It runs server-side with the service-role client, which bypasses RLS, and is scoped by an explicit query: look up the token, verify `revoked_at is null` and `expires_at` is future, then read only that `meeting_id`. Nothing else is reachable.
- Service role is used in exactly three places: the share page, `/api/cron/*`, and the pipeline's storage reads. Every other server path uses the request-scoped user client so RLS still applies.

**RLS is not the only permission check.** Postgres also enforces table-level `GRANT`s
before RLS ever runs — a role with no `GRANT` on a table gets "permission denied"
regardless of what its RLS policies say. Supabase's dashboard normally handles this
invisibly: creating a table there with "Automatically expose new tables" on
auto-grants `anon`/`authenticated`/`service_role`. This project's project was created
with that toggle **off** (deliberately, so nothing was queryable before RLS was in
place — see `docs/ACTIVITY-LOG.md`, 2026-07-28), which means every migration-created
table needs an explicit `grant` — and the original 8 migrations didn't have one,
caught only when P1.2's client factories were verified against the live project and
every single query came back "permission denied for table X".

Fixed with a 9th migration (`grant_privileges`) granting broadly to
`anon`/`authenticated`/`service_role` on the whole `public` schema, plus
`alter default privileges` so it applies automatically to tables created by future
migrations too. This is not a loosening of security — `anon` still has no session, so
`auth.uid()` is null and every `user_id = auth.uid()` policy still evaluates false for
it. Table-level access without a matching row is not data access. **Anyone adding a
new table by raw migration (not the dashboard) does not need to repeat this** — the
default-privileges statement already covers it — but should know why, in case a
future table somehow ends up outside `public` schema or the default-privileges scope.

## 5. Storage

Bucket **`recordings`**, private.

```
recordings/{user_id}/{meeting_id}/{chunk_index}.webm
```

Policies:

```sql
create policy "own audio read" on storage.objects for select
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own audio insert" on storage.objects for insert
  with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own audio delete" on storage.objects for delete
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
```

Uploads use signed upload URLs so the file goes browser → Supabase directly. Playback uses a signed download URL with a 1-hour TTL.

## 6. Retention

The daily sweep deletes storage objects for meetings where `created_at < now() - (retention_days || ' days')::interval`, `pinned = false`, and `audio_purged_at is null`, then stamps `audio_purged_at`. Transcripts, minutes, and action items survive — only the audio is removed. The meeting page then hides the player and shows "Audio removed after N days. Transcript retained."

## 7. Sizing against the 500 MB limit

| Item | Estimate |
| --- | --- |
| Transcript, 1-hour meeting | ~9,000 words ≈ 60 KB across ~700 segment rows |
| Summary + actions + email | ~8 KB |
| Per meeting total | **~70 KB** |
| Meetings before 500 MB | ~7,000 |

Comfortable. Storage (1 GB) binds first: a 1-hour meeting at 16 kHz mono Opus is roughly 45 MB, so ~22 unpurged hours of audio at once. The 7-day retention policy is what keeps this within limits, not an optional cleanup.

## 8. Migrations

**Done, applied 2026-07-28** against the live project (`syncmind`,
`ap-southeast-1`). SQL files under `supabase/migrations/`, created with
`supabase migration new <name>` — real CLI-generated `<timestamp>_<name>.sql`
filenames, not the illustrative `0001_x.sql` numbering originally sketched here.
Applied with `supabase db push --linked`. Never edit an applied migration; add a new
one.

```
<ts>_enums.sql
<ts>_profiles_and_trigger.sql
<ts>_meetings_and_chunks.sql
<ts>_transcripts.sql
<ts>_summaries_actions_email.sql
<ts>_share_ask_usage.sql
<ts>_rls_policies.sql
<ts>_storage_bucket_and_policies.sql
```

Verified against the live database, not just "migration ran without error": all 10
tables exist with `rowsecurity = true`, 13 policies total (10 owner-only + 3 storage),
the `recordings` bucket exists and is private, the `on_auth_user_created` trigger
exists.

Types are generated into `server/models/database.types.ts` (not `lib/supabase/types.ts`
— per the `server/` backend convention locked in `ARCHITECTURE.md` §4, generated
table types belong in `server/models/`, the only layer allowed to import a Supabase
client) with `supabase gen types typescript --linked`; regenerate after every
migration and commit the result.
