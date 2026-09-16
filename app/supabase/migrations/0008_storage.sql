-- Bucket public pour les photos de profil et de groupe.
-- Convention de chemin : avatars/{user_id}/{filename} ou group-photos/{group_id}/{filename}
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "photos_public_read" on storage.objects
  for select to authenticated, anon
  using (bucket_id = 'photos');

create policy "photos_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "photos_update_own_folder" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "photos_delete_own_folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Photos de groupe : seul le owner du groupe peut écrire dans group-photos/{group_id}/...
create policy "group_photos_insert_owner" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = 'group-photos'
    and exists (
      select 1 from public.groups g
      where g.id::text = (storage.foldername(name))[2] and g.owner_id = auth.uid()
    )
  );

create policy "group_photos_update_owner" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = 'group-photos'
    and exists (
      select 1 from public.groups g
      where g.id::text = (storage.foldername(name))[2] and g.owner_id = auth.uid()
    )
  );
