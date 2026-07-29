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
