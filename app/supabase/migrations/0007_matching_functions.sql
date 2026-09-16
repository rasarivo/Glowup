-- Renvoie les profils visibles à proximité, triés par nombre d'intérêts communs
-- puis par distance. Respecte les préférences de genre quand elles sont définies.
create or replace function public.nearby_profiles(radius_km double precision default 50, limit_count int default 30)
returns table (
  id uuid,
  full_name text,
  birthdate date,
  bio text,
  city text,
  distance_km double precision,
  shared_interest_count int,
  shared_interests text[]
)
language sql
stable
security definer set search_path = public
as $$
  with me as (
    select p.id, p.location, p.gender, p.looking_for
    from public.profiles p
    where p.id = auth.uid()
  ),
  my_interests as (
    select interest_id from public.profile_interests where profile_id = auth.uid()
  ),
  candidates as (
    select
      p.id,
      p.full_name,
      p.birthdate,
      p.bio,
      p.city,
      (st_distance(p.location, (select location from me)) / 1000.0) as distance_km
    from public.profiles p, me
    where p.id <> me.id
      and p.is_visible = true
      and p.location is not null
      and me.location is not null
      and st_dwithin(p.location, me.location, radius_km * 1000.0)
      and not exists (select 1 from public.swipes s where s.swiper_id = auth.uid() and s.swipee_id = p.id)
      and (cardinality((select looking_for from me)) = 0 or p.gender = any((select looking_for from me)))
      and (cardinality(p.looking_for) = 0 or (select gender from me) = any(p.looking_for))
  )
  select
    c.id,
    c.full_name,
    c.birthdate,
    c.bio,
    c.city,
    c.distance_km,
    count(pi.interest_id)::int as shared_interest_count,
    coalesce(array_agg(i.name) filter (where i.name is not null), '{}') as shared_interests
  from candidates c
  left join public.profile_interests pi on pi.profile_id = c.id and pi.interest_id in (select interest_id from my_interests)
  left join public.interests i on i.id = pi.interest_id
  group by c.id, c.full_name, c.birthdate, c.bio, c.city, c.distance_km
  order by shared_interest_count desc, c.distance_km asc
  limit limit_count;
$$;

grant execute on function public.nearby_profiles(double precision, int) to authenticated;

-- Renvoie les groupes à proximité, avec le nombre de membres et si l'utilisateur en fait déjà partie.
create or replace function public.nearby_groups(radius_km double precision default 50, limit_count int default 30)
returns table (
  id uuid,
  name text,
  description text,
  interest_id uuid,
  interest_name text,
  city text,
  distance_km double precision,
  member_count int,
  is_member boolean
)
language sql
stable
security definer set search_path = public
as $$
  with me as (
    select location from public.profiles where id = auth.uid()
  )
  select
    g.id,
    g.name,
    g.description,
    g.interest_id,
    i.name as interest_name,
    g.city,
    case when g.location is not null and (select location from me) is not null
      then st_distance(g.location, (select location from me)) / 1000.0
      else null
    end as distance_km,
    (select count(*) from public.group_members gm where gm.group_id = g.id)::int as member_count,
    exists (select 1 from public.group_members gm where gm.group_id = g.id and gm.profile_id = auth.uid()) as is_member
  from public.groups g
  left join public.interests i on i.id = g.interest_id
  where g.location is null or (select location from me) is null or st_dwithin(g.location, (select location from me), radius_km * 1000.0)
  order by distance_km asc nulls last, member_count desc
  limit limit_count;
$$;

grant execute on function public.nearby_groups(double precision, int) to authenticated;

-- Met à jour la position approximative du profil courant (arrondie ~1km pour la vie privée)
create or replace function public.update_my_location(lat double precision, lng double precision)
returns void
language sql
security definer set search_path = public
as $$
  update public.profiles
  set
    location = extensions.st_setsrid(extensions.st_makepoint(
      round(lng::numeric, 2)::double precision,
      round(lat::numeric, 2)::double precision
    ), 4326)::extensions.geography,
    location_updated_at = now()
  where id = auth.uid();
$$;

grant execute on function public.update_my_location(double precision, double precision) to authenticated;
