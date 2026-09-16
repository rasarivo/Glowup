-- Profils utilisateurs. Un profil = un utilisateur auth.users.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  birthdate date not null,
  gender text check (gender in ('femme', 'homme', 'autre')),
  looking_for text[] not null default '{}', -- ex: {'femme','homme','autre'}
  bio text default '' check (char_length(bio) <= 500),
  city text,
  location extensions.geography(point, 4326), -- position approximative (lat/lng)
  location_updated_at timestamptz,
  is_visible boolean not null default true, -- masquer temporairement son profil
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Profil public de chaque utilisateur, lié 1:1 à auth.users.';
comment on column public.profiles.location is 'Position approximative utilisée pour le matching de proximité (arrondie côté client pour la vie privée).';

create index if not exists profiles_location_idx on public.profiles using gist (location);

-- garde updated_at à jour
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Photos de profil (plusieurs par profil, ordonnées)
create table if not exists public.profile_photos (
  id uuid primary key default extensions.uuid_generate_v4(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  url text not null,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (profile_id, position)
);

create index if not exists profile_photos_profile_id_idx on public.profile_photos (profile_id);

-- Crée automatiquement une ligne profiles quand un utilisateur s'inscrit
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, birthdate)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Nouveau membre'),
    coalesce((new.raw_user_meta_data ->> 'birthdate')::date, (now() - interval '18 years')::date)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.profile_photos enable row level security;

-- Tout utilisateur connecté peut voir les profils visibles (nécessaire pour le matching)
create policy "profiles_select_visible" on public.profiles
  for select to authenticated
  using (is_visible = true or id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "profile_photos_select" on public.profile_photos
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_photos.profile_id and (p.is_visible = true or p.id = auth.uid())
    )
  );

create policy "profile_photos_write_own" on public.profile_photos
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
