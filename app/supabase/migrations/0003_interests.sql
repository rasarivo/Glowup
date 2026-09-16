-- Catalogue des loisirs & sports (référentiel commun)
create table if not exists public.interests (
  id uuid primary key default extensions.uuid_generate_v4(),
  category text not null check (category in ('sport', 'plein_air', 'culture', 'creatif', 'social', 'bien_etre')),
  name text not null unique,
  emoji text not null default '✨'
);

create table if not exists public.profile_interests (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  interest_id uuid not null references public.interests (id) on delete cascade,
  primary key (profile_id, interest_id)
);

create index if not exists profile_interests_interest_id_idx on public.profile_interests (interest_id);

alter table public.interests enable row level security;
alter table public.profile_interests enable row level security;

create policy "interests_select_all" on public.interests
  for select to authenticated
  using (true);

create policy "profile_interests_select" on public.profile_interests
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_interests.profile_id and (p.is_visible = true or p.id = auth.uid())
    )
  );

create policy "profile_interests_write_own" on public.profile_interests
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
