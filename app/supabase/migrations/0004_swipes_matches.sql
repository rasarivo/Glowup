-- Likes/pass envoyés par un utilisateur
create table if not exists public.swipes (
  id uuid primary key default extensions.uuid_generate_v4(),
  swiper_id uuid not null references public.profiles (id) on delete cascade,
  swipee_id uuid not null references public.profiles (id) on delete cascade,
  liked boolean not null,
  created_at timestamptz not null default now(),
  unique (swiper_id, swipee_id),
  check (swiper_id <> swipee_id)
);

create index if not exists swipes_swipee_id_idx on public.swipes (swipee_id);

-- Un match = deux profils qui se sont mutuellement likés. user_a < user_b garanti pour éviter les doublons.
create table if not exists public.matches (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);

create index if not exists matches_user_a_idx on public.matches (user_a);
create index if not exists matches_user_b_idx on public.matches (user_b);

alter table public.swipes enable row level security;
alter table public.matches enable row level security;

create policy "swipes_select_own" on public.swipes
  for select to authenticated
  using (swiper_id = auth.uid() or swipee_id = auth.uid());

create policy "swipes_insert_own" on public.swipes
  for insert to authenticated
  with check (swiper_id = auth.uid());

create policy "matches_select_own" on public.matches
  for select to authenticated
  using (auth.uid() in (user_a, user_b));

-- RPC: enregistre un like/pass et crée le match si réciproque. Retourne true si match créé.
create or replace function public.swipe_profile(p_swipee_id uuid, p_liked boolean)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_swiper_id uuid := auth.uid();
  v_reciprocal boolean;
  v_user_a uuid;
  v_user_b uuid;
  v_matched boolean := false;
begin
  if v_swiper_id is null then
    raise exception 'not authenticated';
  end if;
  if v_swiper_id = p_swipee_id then
    raise exception 'cannot swipe yourself';
  end if;

  insert into public.swipes (swiper_id, swipee_id, liked)
  values (v_swiper_id, p_swipee_id, p_liked)
  on conflict (swiper_id, swipee_id) do update set liked = excluded.liked, created_at = now();

  if p_liked then
    select exists (
      select 1 from public.swipes
      where swiper_id = p_swipee_id and swipee_id = v_swiper_id and liked = true
    ) into v_reciprocal;

    if v_reciprocal then
      v_user_a := least(v_swiper_id, p_swipee_id);
      v_user_b := greatest(v_swiper_id, p_swipee_id);
      insert into public.matches (user_a, user_b)
      values (v_user_a, v_user_b)
      on conflict (user_a, user_b) do nothing;
      v_matched := true;
    end if;
  end if;

  return v_matched;
end;
$$;

grant execute on function public.swipe_profile(uuid, boolean) to authenticated;
