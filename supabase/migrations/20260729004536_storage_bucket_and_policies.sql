insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false);

-- recordings/{user_id}/{meeting_id}/{chunk_index}.webm
create policy "own audio read" on storage.objects for select
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own audio insert" on storage.objects for insert
  with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own audio delete" on storage.objects for delete
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
