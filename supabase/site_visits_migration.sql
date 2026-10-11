-- ═══════════════════════════════════════════════════════════
-- लोकल Den — Site Visits & Unique Visitor Tracker Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  source text not null default 'direct',
  landing_path text default '/',
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Indexes for performance on aggregate lookups
create index if not exists idx_site_visits_visitor_id on public.site_visits (visitor_id);
create index if not exists idx_site_visits_source on public.site_visits (source);
create index if not exists idx_site_visits_created_at on public.site_visits (created_at desc);

-- Enable Row Level Security
alter table public.site_visits enable row level security;

-- 1. Allow everyone (anonymous visitors and authenticated users) to record visits
drop policy if exists "Allow public visit insert" on public.site_visits;
create policy "Allow public visit insert"
  on public.site_visits for insert
  with check (true);

-- 2. Allow reading visit records for admin analytics
drop policy if exists "Allow visit read" on public.site_visits;
create policy "Allow visit read"
  on public.site_visits for select
  using (true);

-- 3. Optional helper function to get aggregated visit stats quickly
create or replace function public.get_site_visit_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  total_unique integer;
  total_raw integer;
  source_stats jsonb;
begin
  select count(distinct visitor_id), count(*)
    into total_unique, total_raw
    from public.site_visits;

  select coalesce(jsonb_agg(s), '[]'::jsonb)
    into source_stats
    from (
      select
        source,
        count(distinct visitor_id) as unique_count,
        count(*) as total_count,
        max(created_at) as last_visited_at
      from public.site_visits
      group by source
      order by count(distinct visitor_id) desc
    ) s;

  return jsonb_build_object(
    'total_unique', coalesce(total_unique, 0),
    'total_visits', coalesce(total_raw, 0),
    'sources', source_stats
  );
end;
$$;

