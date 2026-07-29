-- Timestamps are absolute within the meeting -- Whisper returns chunk-relative
-- values and the pipeline adds audio_chunks.start_sec before insert.
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
