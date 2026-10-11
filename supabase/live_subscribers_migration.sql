-- Email subscribers for local event digests. Run after live_events_migration.sql

create table if not exists public.live_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  city text not null,
  interests text[] not null default '{music,dj,gaming}',
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  is_active boolean not null default true,
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.live_subscribers enable row level security;
create policy "subscribers admin read" on public.live_subscribers for select
  using (public.current_user_is_admin());
create policy "subscribers admin write" on public.live_subscribers for all
  using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- Public subscribe (upsert, never exposes other subscribers)
create or replace function public.subscribe_live(p_email text, p_city text, p_interests text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Invalid email'; end if;
  insert into live_subscribers (email, city, interests)
  values (lower(trim(p_email)), p_city, coalesce(nullif(p_interests, '{}'), '{music,dj,gaming}'))
  on conflict (email) do update
    set city = excluded.city, interests = excluded.interests, is_active = true;
end $$;
grant execute on function public.subscribe_live(text, text, text[]) to anon, authenticated;

create or replace function public.unsubscribe_live(p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update live_subscribers set is_active = false where unsubscribe_token = p_token;
  get diagnostics n = row_count;
  return n > 0;
end $$;
grant execute on function public.unsubscribe_live(uuid) to anon, authenticated;

