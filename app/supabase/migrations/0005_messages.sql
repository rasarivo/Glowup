-- Messages échangés entre deux profils matchés
create table if not exists public.messages (
  id uuid primary key default extensions.uuid_generate_v4(),
  match_id uuid not null references public.matches (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_match_id_created_at_idx on public.messages (match_id, created_at);

alter table public.messages enable row level security;

create policy "messages_select_in_own_match" on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id and auth.uid() in (m.user_a, m.user_b)
    )
  );

create policy "messages_insert_in_own_match" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id and auth.uid() in (m.user_a, m.user_b)
    )
  );

create policy "messages_update_own_read_state" on public.messages
  for update to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id and auth.uid() in (m.user_a, m.user_b)
    )
  )
  with check (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id and auth.uid() in (m.user_a, m.user_b)
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
