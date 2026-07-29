-- One row per meeting. Structured lists live in JSONB so the UI can render and edit
-- them without a table per concept, while *_md (email_drafts.body_md) holds the
-- user-edited rendering that exports use.
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

-- Calendar delivery is a client-generated .ics download (lib/export/ics.ts), not a
-- Calendar API call, so there is no server-side event id to track.
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
-- No gmail_draft_id -- the composer builds a Gmail deep link client-side
-- (lib/export/gmail.ts) from these columns, it does not call the Gmail API.
