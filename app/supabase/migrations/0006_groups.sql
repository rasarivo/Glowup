-- Groupes centrés sur une activité (loisir/sport), ex: "Running du dimanche"
create table if not exists public.groups (
  id uuid primary key default extensions.uuid_generate_v4(),
  name text not null check (char_length(name) between 2 and 80),
  description text default '' check (char_length(description) <= 1000),
  interest_id uuid references public.interests (id) on delete set null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  city text,
  location extensions.geography(point, 4326),
  photo_url text,
  max_members int check (max_members is null or max_members > 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists groups_location_idx on public.groups using gist (location);
create index if not exists groups_interest_id_idx on public.groups (interest_id);

drop trigger if exists groups_set_updated_at on public.groups;
create trigger groups_set_updated_at
  before update on public.groups
  for each row execute function public.set_updated_at();

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

create table if not exists public.group_messages (
  id uuid primary key default extensions.uuid_generate_v4(),
  group_id uuid not null references public.groups (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists group_messages_group_id_created_at_idx on public.group_messages (group_id, created_at);

-- Ajoute automatiquement le créateur comme membre/owner du groupe
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.group_members (group_id, profile_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_group_created on public.groups;
create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_messages enable row level security;

create policy "groups_select_all" on public.groups
  for select to authenticated
  using (true);

create policy "groups_insert_own" on public.groups
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy "groups_update_owner" on public.groups
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "groups_delete_owner" on public.groups
  for delete to authenticated
  using (owner_id = auth.uid());

create policy "group_members_select_all" on public.group_members
  for select to authenticated
  using (true);

create policy "group_members_join_self" on public.group_members
  for insert to authenticated
  with check (profile_id = auth.uid());

create policy "group_members_leave_self_or_owner" on public.group_members
  for delete to authenticated
  using (
    profile_id = auth.uid()
    or exists (select 1 from public.groups g where g.id = group_members.group_id and g.owner_id = auth.uid())
  );

create policy "group_messages_select_members" on public.group_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_messages.group_id and gm.profile_id = auth.uid()
    )
  );

create policy "group_messages_insert_members" on public.group_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = group_messages.group_id and gm.profile_id = auth.uid()
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_messages'
  ) then
    alter publication supabase_realtime add table public.group_messages;
  end if;
end $$;
