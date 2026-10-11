-- Artist booking: availability dates, ratings/reviews, photo uploads
-- Run after live_events_migration.sql

alter table public.live_artists
  add column if not exists available_dates date[] not null default '{}',
  add column if not exists rating numeric(2,1) not null default 0,
  add column if not exists review_count integer not null default 0;

create table if not exists public.artist_reviews (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.live_artists(id) on delete cascade,
  reviewer_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
alter table public.artist_reviews enable row level security;
create policy "artist reviews read" on public.artist_reviews for select using (true);
create policy "artist reviews admin write" on public.artist_reviews for all
  using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- Keep artist rating in sync with reviews
create or replace function public.sync_artist_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare aid uuid := coalesce(new.artist_id, old.artist_id);
begin
  update public.live_artists a set
    rating = coalesce((select round(avg(rating)::numeric, 1) from public.artist_reviews where artist_id = aid), 0),
    review_count = (select count(*) from public.artist_reviews where artist_id = aid)
  where a.id = aid;
  return null;
end $$;
drop trigger if exists trg_sync_artist_rating on public.artist_reviews;
create trigger trg_sync_artist_rating after insert or update or delete on public.artist_reviews
  for each row execute function public.sync_artist_rating();

-- Dates already confirmed for an artist (public-safe)
create or replace function public.artist_booked_dates(p_artist uuid) returns date[]
language sql security definer set search_path = public stable as $$
  select coalesce(array_agg(event_date), '{}') from public.artist_hire_requests
  where artist_id = p_artist and status = 'confirmed' and event_date is not null;
$$;
grant execute on function public.artist_booked_dates(uuid) to anon, authenticated;

-- Booking must be on an available, not-yet-confirmed date
create or replace function public.check_artist_booking_date() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.event_date is null then raise exception 'Please choose a date'; end if;
  if not exists (select 1 from live_artists where id = new.artist_id and new.event_date = any(available_dates)) then
    raise exception 'Artist is not available on this date';
  end if;
  if new.event_date = any(public.artist_booked_dates(new.artist_id)) then
    raise exception 'This date is already booked';
  end if;
  return new;
end $$;
drop trigger if exists trg_check_artist_booking on public.artist_hire_requests;
create trigger trg_check_artist_booking before insert on public.artist_hire_requests
  for each row execute function public.check_artist_booking_date();

-- Public bucket for artist photos (admin upload only)
insert into storage.buckets (id, name, public) values ('artist-photos', 'artist-photos', true)
  on conflict (id) do nothing;
create policy "artist photos read" on storage.objects for select using (bucket_id = 'artist-photos');
create policy "artist photos admin write" on storage.objects for all
  using (bucket_id = 'artist-photos' and public.current_user_is_admin())
  with check (bucket_id = 'artist-photos' and public.current_user_is_admin());

