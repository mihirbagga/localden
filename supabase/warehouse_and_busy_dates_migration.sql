-- ═══════════════════════════════════════════════════════════════════════════
-- LocalDen — Warehouse Location, Distance Delivery & Booked Dates Availability
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Function to safely expose booked date ranges to prospective renters (bypasses RLS)
create or replace function public.get_listing_booked_ranges(p_listing_id uuid)
returns table (
  start_date date,
  end_date date,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select b.start_date, b.end_date, b.status
  from public.bookings b
  where b.listing_id = p_listing_id
    and b.status in ('pending', 'confirmed', 'active')
  order by b.start_date asc;
$$;

grant execute on function public.get_listing_booked_ranges(uuid) to anon, authenticated;

-- 2. View for busy ranges (security_invoker = false)
create or replace view public.listing_busy_ranges
with (security_invoker = false) as
select listing_id, start_date, end_date, status
from public.bookings
where status in ('pending', 'confirmed', 'active');

grant select on public.listing_busy_ranges to anon, authenticated;

-- 3. Function to compute busy dates given stock
create or replace function public.listing_busy_dates(
  p_listing_id uuid,
  p_from date,
  p_to date
)
returns table(day date)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_units int;
begin
  select greatest(coalesce(nullif(stock_total, 0), nullif(stock_qty, 0), 1), 1)
    into v_units
  from public.listings
  where id = p_listing_id;

  if v_units is null then
    return;
  end if;

  return query
  with days as (
    select generate_series(p_from, p_to, interval '1 day')::date as d
  ),
  taken as (
    select d.d as day, count(*)::int as cnt
    from days d
    join public.bookings b
      on b.listing_id = p_listing_id
     and b.status in ('pending', 'confirmed', 'active')
     and b.start_date <= d.d
     and b.end_date > d.d
    group by d.d
  )
  select t.day from taken t where t.cnt >= v_units;
end;
$$;

grant execute on function public.listing_busy_dates(uuid, date, date) to anon, authenticated;

-- 4. Seed default warehouse settings in site_settings
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'site_settings' and column_name = 'id'
  ) then
    insert into public.site_settings (id, value, updated_at)
    values (
      'warehouse_delivery_settings',
      jsonb_build_object(
        'warehouse_name', 'LocalDen Koramangala Hub',
        'warehouse_address', '4th Block, Koramangala, Bengaluru, Karnataka 560034',
        'warehouse_lat', 12.9352,
        'warehouse_lng', 77.6245,
        'base_fee', 99,
        'base_km_included', 3,
        'per_km_rate', 15,
        'min_fee', 49,
        'max_fee', 499,
        'free_delivery_above', 3500,
        'print_note', 'Dispatched from Koramangala Hub · Verified & Sanitized with Anti-Static Packaging · Tested Before Dispatch'
      ),
      now()
    )
    on conflict do nothing;
  elsif exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'site_settings' and column_name = 'key'
  ) then
    insert into public.site_settings (key, value, updated_at)
    values (
      'warehouse_delivery_settings',
      jsonb_build_object(
        'warehouse_name', 'LocalDen Koramangala Hub',
        'warehouse_address', '4th Block, Koramangala, Bengaluru, Karnataka 560034',
        'warehouse_lat', 12.9352,
        'warehouse_lng', 77.6245,
        'base_fee', 99,
        'base_km_included', 3,
        'per_km_rate', 15,
        'min_fee', 49,
        'max_fee', 499,
        'free_delivery_above', 3500,
        'print_note', 'Dispatched from Koramangala Hub · Verified & Sanitized with Anti-Static Packaging · Tested Before Dispatch'
      ),
      now()
    )
    on conflict do nothing;
  end if;
end $$;

-- 5. Add optional delivery & wallet columns to bookings table
alter table public.bookings add column if not exists delivery_fee numeric default 0;
alter table public.bookings add column if not exists delivery_distance_km numeric default 0;
alter table public.bookings add column if not exists warehouse_note text;
alter table public.bookings add column if not exists wallet_amount numeric default 0;
alter table public.bookings add column if not exists paid_amount numeric default 0;

