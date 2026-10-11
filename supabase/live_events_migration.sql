-- Live page: events (AI-fetched + manual), hireable artists, hire requests
-- Needs current_user_is_admin() from admin_migration.sql

create table if not exists public.live_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'music' check (category in ('music','gaming','dj','other')),
  city text not null,
  venue text,
  description text,
  image_url text,
  event_date timestamptz,
  ticket_url text,
  price_label text,
  source text not null default 'manual',      -- 'manual' | 'ai'
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (title, city, event_date)
);

create table if not exists public.live_artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'dj' check (type in ('dj','singer','band','instrumentalist','gamer','other')),
  genres text[] default '{}',
  city text,
  bio text,
  image_url text,
  price_from integer,                          -- INR per event
  instagram_url text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.artist_hire_requests (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.live_artists(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  phone text not null,
  event_type text,
  event_date date,
  city text,
  budget integer,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.live_events enable row level security;
alter table public.live_artists enable row level security;
alter table public.artist_hire_requests enable row level security;

create policy "events read" on public.live_events for select
  using (is_active = true or public.current_user_is_admin());
create policy "events admin write" on public.live_events for all
  using (public.current_user_is_admin()) with check (public.current_user_is_admin());

create policy "artists read" on public.live_artists for select
  using (is_active = true or public.current_user_is_admin());
create policy "artists admin write" on public.live_artists for all
  using (public.current_user_is_admin()) with check (public.current_user_is_admin());

create policy "hire insert" on public.artist_hire_requests for insert
  with check (true);
create policy "hire admin read" on public.artist_hire_requests for select
  using (public.current_user_is_admin() or user_id = auth.uid());
create policy "hire admin update" on public.artist_hire_requests for update
  using (public.current_user_is_admin());
create policy "hire admin delete" on public.artist_hire_requests for delete
  using (public.current_user_is_admin());

