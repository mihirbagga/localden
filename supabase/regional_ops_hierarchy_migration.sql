-- ═══════════════════════════════════════════════════════════════════════════
-- LocalDen — Regional Ops Hierarchy, Hubs, Staff & Audit Logging Migration
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. CITIES TABLE
create table if not exists public.cities (
  id text primary key, -- 'bengaluru', 'gurugram', 'mumbai', etc.
  name text not null,
  display_name text not null,
  short_name text,
  state text,
  popular_localities text[] default '{}'::text[],
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed existing operational cities
insert into public.cities (id, name, display_name, short_name, state, popular_localities, is_active)
values
  (
    'bengaluru',
    'Bengaluru',
    'Bengaluru (Bangalore)',
    'Bengaluru',
    'Karnataka',
    array['Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 'BTM Layout', 'Jayanagar', 'JP Nagar', 'Bellandur', 'Marathahalli', 'Electronic City', 'Sadashivanagar', 'Malleshwaram', 'Hebbal', 'Sarjapur Road', 'Yelahanka', 'Banashankari'],
    true
  ),
  (
    'gurugram',
    'Gurugram',
    'Gurugram (Gurgaon)',
    'Gurugram',
    'Haryana / NCR',
    array['Cyber City', 'DLF Phase 1', 'DLF Phase 2', 'DLF Phase 3', 'DLF Phase 4', 'DLF Phase 5', 'Golf Course Road', 'Golf Course Ext Road', 'Sector 29', 'Sector 56', 'Sector 57', 'Sohna Road', 'MG Road', 'Sushant Lok', 'Nirvana Country', 'South City'],
    true
  )
on conflict (id) do update set
  display_name = excluded.display_name,
  popular_localities = excluded.popular_localities,
  is_active = excluded.is_active;

-- 2. HUBS TABLE (Warehouses / Dispatch Centers)
create table if not exists public.hubs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  city_id text references public.cities(id) on delete set null,
  city text not null,
  address text,
  contact_phone text,
  lat double precision,
  lng double precision,
  manager_id uuid references public.profiles(id) on delete set null,
  is_active boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed initial hubs
insert into public.hubs (name, city_id, city, address, contact_phone, lat, lng, is_active)
values
  (
    'LocalDen Koramangala Hub',
    'bengaluru',
    'Bengaluru',
    '4th Block, Koramangala, Bengaluru, Karnataka 560034',
    '+91 90346 95091',
    12.9352,
    77.6245,
    true
  ),
  (
    'LocalDen CyberHub Dispatch',
    'gurugram',
    'Gurugram',
    'DLF Cyber City, Phase 2, Gurugram, Haryana 122002',
    '+91 98110 54321',
    28.4952,
    77.0895,
    true
  )
on conflict do nothing;

-- 3. OPS STAFF TABLE (Runners, Pickers, Packers, Drivers, Supervisors)
create table if not exists public.ops_staff (
  id uuid default gen_random_uuid() primary key,
  hub_id uuid references public.hubs(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  phone text not null,
  role text not null check (role in ('runner', 'picker', 'packer', 'driver', 'supervisor')),
  shift text default 'morning' check (shift in ('morning', 'evening', 'both', 'on-call')),
  salary numeric default 0,
  is_active boolean default true,
  hired_at date default current_date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. PROFILES EXTENSIONS
alter table public.profiles add column if not exists assigned_cities text[] default '{}'::text[];
alter table public.profiles add column if not exists assigned_hub_id uuid references public.hubs(id) on delete set null;
alter table public.profiles add column if not exists deleted_at timestamptz;
alter table public.profiles add column if not exists deletion_requested_at timestamptz;
alter table public.profiles add column if not exists deletion_reason text;
alter table public.profiles add column if not exists gstin text;
alter table public.profiles add column if not exists business_name text;

-- 5. LISTINGS & BOOKINGS EXTENSIONS
alter table public.listings add column if not exists hub_id uuid references public.hubs(id) on delete set null;
alter table public.listings add column if not exists city text;
alter table public.listings add column if not exists deleted_at timestamptz;
alter table public.listings add column if not exists cancellation_policy text default 'flexible';

alter table public.bookings add column if not exists hub_id uuid references public.hubs(id) on delete set null;
alter table public.bookings add column if not exists city text;
alter table public.bookings add column if not exists deleted_at timestamptz;

-- 6. AUDIT LOG TABLE
create table if not exists public.audit_log (
  id uuid default gen_random_uuid() primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb,
  created_at timestamptz default now()
);

-- 7. BOOKING EVENT HISTORY
create table if not exists public.booking_events (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references public.bookings(id) on delete cascade,
  event text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- 8. COMMUNICATION LOG (WhatsApp & System alerts)
create table if not exists public.comm_log (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references public.bookings(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  channel text default 'whatsapp',
  event_type text not null,
  recipient text not null,
  message text not null,
  status text default 'sent',
  error text,
  created_at timestamptz default now()
);

-- 9. ROW LEVEL SECURITY (RLS)
alter table public.cities enable row level security;
alter table public.hubs enable row level security;
alter table public.ops_staff enable row level security;
alter table public.audit_log enable row level security;
alter table public.booking_events enable row level security;
alter table public.comm_log enable row level security;

-- Public can view active cities and hubs
drop policy if exists "Public can view active cities" on public.cities;
create policy "Public can view active cities" on public.cities
  for select using (true);

drop policy if exists "Public can view active hubs" on public.hubs;
create policy "Public can view active hubs" on public.hubs
  for select using (is_active = true);

-- Admins full access
drop policy if exists "Admins can manage cities" on public.cities;
create policy "Admins can manage cities" on public.cities
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or p.admin_role in ('super_admin', 'admin', 'regional_admin'))
    )
  );

drop policy if exists "Admins can manage hubs" on public.hubs;
create policy "Admins can manage hubs" on public.hubs
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or p.admin_role in ('super_admin', 'admin', 'regional_admin', 'hub_manager'))
    )
  );

drop policy if exists "Admins can manage ops staff" on public.ops_staff;
create policy "Admins can manage ops staff" on public.ops_staff
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or p.admin_role in ('super_admin', 'admin', 'regional_admin', 'hub_manager'))
    )
  );

drop policy if exists "Admins can read audit log" on public.audit_log;
create policy "Admins can read audit log" on public.audit_log
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or p.admin_role in ('super_admin', 'admin', 'regional_admin'))
    )
  );

drop policy if exists "Admins can insert audit log" on public.audit_log;
create policy "Admins can insert audit log" on public.audit_log
  for insert with check (true);

drop policy if exists "Admins can view booking events" on public.booking_events;
create policy "Admins can view booking events" on public.booking_events
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or p.admin_role in ('super_admin', 'admin', 'regional_admin', 'hub_manager'))
    )
  );

drop policy if exists "System can log booking events" on public.booking_events;
create policy "System can log booking events" on public.booking_events
  for insert with check (true);

drop policy if exists "Admins can view comm log" on public.comm_log;
create policy "Admins can view comm log" on public.comm_log
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or p.admin_role in ('super_admin', 'admin', 'regional_admin'))
    )
  );

drop policy if exists "System can insert comm log" on public.comm_log;
create policy "System can insert comm log" on public.comm_log
  for insert with check (true);

