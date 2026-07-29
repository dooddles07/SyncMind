-- No google_connections table. SyncMind never holds a Google access or refresh
-- token -- sign-in is Supabase Auth's own OAuth flow, and Gmail/Calendar are reached
-- through a compose link and a downloaded file, not an authenticated API call.
-- See docs/SECURITY-PRIVACY.md section 4.
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

-- Kept for rate limiting and so a user can revisit prior answers.
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

create table usage_daily (
  user_id         uuid not null references profiles(id) on delete cascade,
  day             date not null default current_date,
  audio_seconds   integer not null default 0,
  llm_calls       integer not null default 0,
  llm_tokens      integer not null default 0,
  asr_calls       integer not null default 0,
  primary key (user_id, day)
);
