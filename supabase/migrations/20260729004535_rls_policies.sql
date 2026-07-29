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

-- Owner-only access, applied uniformly. Every child table stores user_id directly
-- rather than joining through meetings -- one extra column, removes a subquery
-- from every policy check.
--
-- The public share page does NOT use these policies: it runs server-side with the
-- service-role client, which bypasses RLS entirely, scoped by an explicit query
-- (look up the token, verify revoked_at is null and expires_at is future, read only
-- that meeting_id). See docs/DATA-MODEL.md section 4.

create policy "own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own rows" on meetings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own rows" on audio_chunks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own rows" on transcript_segments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own rows" on summaries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own rows" on action_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own rows" on email_drafts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own rows" on share_links
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own rows" on ask_queries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own rows" on usage_daily
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
