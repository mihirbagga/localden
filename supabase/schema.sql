-- ═══════════════════════════════════════════════════════════
-- लोकल Den — Supabase PostgreSQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── 1. Profiles (extends auth.users) ────────────────────────
create table if not exists public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  full_name     text,
  phone         text unique,
  email         text,
  avatar_url    text,
  bio           text,
  location      text default 'Bangalore',
  kyc_status    text default 'pending' check (kyc_status in ('pending', 'submitted', 'verified', 'rejected')),
  aadhaar_last4 text,
  is_lister     boolean default false,
  is_admin      boolean default false,
  admin_role    text default 'none' check (admin_role in ('none', 'admin', 'super_admin')),
  is_banned     boolean default false,
  rating        numeric(2,1) default 0,
  total_reviews integer default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create or replace function public.welcome_coupon_code(p_name text, p_user_id uuid)
returns text
language plpgsql
as $$
declare
  slug text;
  base text;
  vCode text;
  suffix text;
begin
  slug := upper(regexp_replace(split_part(trim(coalesce(p_name, '')), ' ', 1), '[^A-Za-z0-9]', '', 'g'));
  if coalesce(slug, '') = '' then
    slug := 'USER';
  end if;
  if char_length(slug) > 12 then
    slug := left(slug, 12);
  end if;
  base := 'WELCOME' || slug || '50';
  vCode := base;
  suffix := upper(left(replace(p_user_id::text, '-', ''), 4));
  if exists (select 1 from public.coupons c where upper(c.code) = upper(vCode)) then
    vCode := base || suffix;
  end if;
  return vCode;
end;
$$;

-- Auto-create profile + welcome coupon on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
  ccode text;
begin
  uname := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    ''
  );

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, uname);

  begin
    if to_regclass('public.coupons') is null then
      return new;
    end if;
    ccode := public.welcome_coupon_code(uname, new.id);
    insert into public.coupons (
      code, description, discount_type, discount_value,
      usage_limit, is_active, owner_id
    ) values (
      ccode,
      'Welcome 50% off for ' || coalesce(nullif(uname, ''), 'new member'),
      'percent',
      50,
      1,
      true,
      new.id
    );
  exception when others then
    raise warning 'welcome coupon skipped: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 2. Listings ──────────────────────────────────────────────
create table if not exists public.listings (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  title           text not null,
  description     text,
  category        text not null check (category in ('gaming', 'music')),
  subcategory     text not null,
  condition       text default 'good' check (condition in ('like_new', 'good', 'fair')),
  brand           text,
  model           text,

  -- Pricing
  price_day       integer not null,
  price_weekend   integer,
  price_week      integer,
  deposit_amount  integer default 5000,

  -- Location
  location        text not null,
  area            text,
  lat             numeric,
  lng             numeric,

  -- Media
  photos          text[] default '{}',
  emoji           text default '🎮',

  -- Inventory
  stock_qty       integer default 1,
  stock_total     integer default 1,

  -- Status
  is_available    boolean default true,
  is_verified     boolean default false,
  is_featured     boolean default false,
  is_published    boolean default true,

  -- Contact
  contact_phone   text,
  contact_method  text default 'app',

  -- Stats
  total_bookings  integer default 0,
  rating          numeric(2,1) default 0,
  total_reviews   integer default 0,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── 3. Bookings ──────────────────────────────────────────────
create table if not exists public.bookings (
  id              uuid default uuid_generate_v4() primary key,
  listing_id      uuid references public.listings(id) on delete cascade not null,
  renter_id       uuid references public.profiles(id) on delete cascade not null,
  lister_id       uuid references public.profiles(id) on delete cascade not null,

  -- Dates
  start_date      date not null,
  end_date        date not null,
  total_days      integer not null,

  -- Pricing
  price_per_day   integer not null,
  subtotal        integer not null,
  platform_fee    integer not null,   -- 20% of subtotal
  deposit         integer not null,
  total_amount    integer not null,   -- subtotal + deposit

  -- Status
  status          text default 'pending'
                  check (status in ('pending','confirmed','active','completed','cancelled','disputed')),

  -- Payment
  razorpay_order_id   text,
  razorpay_payment_id text,
  payment_status      text default 'pending'
                      check (payment_status in ('pending','paid','refunded','failed')),
  payment_method      text,
  payment_ref         text,

  -- Logistics
  delivery_type   text default 'pickup' check (delivery_type in ('pickup','delivery')),
  delivery_address text,

  -- Notes
  renter_note     text,
  lister_note     text,

  -- Coupon
  coupon_id         uuid,
  coupon_code       text,
  discount_amount   integer default 0,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── 4. Reviews ───────────────────────────────────────────────
create table if not exists public.reviews (
  id            uuid default uuid_generate_v4() primary key,
  booking_id    uuid references public.bookings(id) on delete cascade not null,
  listing_id    uuid references public.listings(id) on delete cascade not null,
  reviewer_id   uuid references public.profiles(id) on delete cascade not null,
  reviewee_id   uuid references public.profiles(id) on delete cascade not null,
  rating        integer not null check (rating between 1 and 5),
  comment       text,
  review_type   text check (review_type in ('renter_to_lister', 'lister_to_renter')),
  is_hidden     boolean default false,
  created_at    timestamptz default now()
);

-- ── 5. Deposits ──────────────────────────────────────────────
create table if not exists public.deposits (
  id                  uuid default uuid_generate_v4() primary key,
  booking_id          uuid references public.bookings(id) on delete cascade not null,
  amount              integer not null,
  status              text default 'held'
                      check (status in ('held','returned','forfeited','partially_returned')),
  razorpay_refund_id  text,
  notes               text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ── 6. Coupons ───────────────────────────────────────────────
create table if not exists public.coupons (
  id              uuid default uuid_generate_v4() primary key,
  code            text not null,
  description     text,
  discount_type   text not null default 'percent'
                  check (discount_type in ('percent', 'flat')),
  discount_value  integer not null check (discount_value > 0),
  min_subtotal    integer default 0,
  max_discount    integer,
  usage_limit     integer,
  used_count      integer not null default 0,
  starts_at       timestamptz,
  ends_at         timestamptz,
  is_active       boolean not null default true,
  owner_id        uuid references public.profiles(id) on delete cascade,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create unique index if not exists coupons_code_upper_idx
  on public.coupons (upper(code));

-- ── 7. Payment methods ───────────────────────────────────────
create table if not exists public.payment_methods (
  id            text primary key,
  name          text not null,
  method_type   text not null
                check (method_type in ('razorpay', 'qr', 'upi', 'bank', 'cash')),
  is_enabled    boolean not null default false,
  sort_order    integer not null default 0,
  config        jsonb not null default '{}'::jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

insert into public.payment_methods (id, name, method_type, is_enabled, sort_order, config)
values
  ('razorpay', 'Razorpay', 'razorpay', false, 1,
    '{"key_id":"","instructions":"Pay securely via cards, UPI, netbanking."}'::jsonb),
  ('qr', 'QR / UPI scan', 'qr', true, 2,
    '{"qr_image_url":"","upi_id":"","instructions":"Scan the QR, pay the total, then tap I have paid."}'::jsonb),
  ('upi', 'UPI ID', 'upi', false, 3,
    '{"upi_id":"","instructions":"Send the total to this UPI ID, then tap I have paid."}'::jsonb),
  ('bank', 'Bank transfer', 'bank', false, 4,
    '{"account_name":"","account_number":"","ifsc":"","bank_name":"","instructions":"Transfer the total and tap I have paid."}'::jsonb),
  ('cash', 'Cash on pickup', 'cash', false, 5,
    '{"instructions":"Pay cash when you collect the gear."}'::jsonb)
on conflict (id) do nothing;

-- ── 8. Site settings ─────────────────────────────────────────
create table if not exists public.site_settings (
  id          text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz default now()
);

insert into public.site_settings (id, value)
values (
  'platform_fee',
  '{"enabled": true, "fee_type": "percent", "fee_value": 20}'::jsonb
)
on conflict (id) do nothing;

-- ── Row Level Security ───────────────────────────────────────
alter table public.profiles  enable row level security;
alter table public.listings  enable row level security;
alter table public.bookings  enable row level security;
alter table public.reviews   enable row level security;
alter table public.deposits  enable row level security;
alter table public.coupons   enable row level security;
alter table public.payment_methods enable row level security;
alter table public.site_settings enable row level security;

-- Profiles: users can read all, only update own
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Listings: anyone can read, only owner can write
create policy "Listings are viewable by everyone"
  on public.listings for select using (true);
create policy "Users can insert own listings"
  on public.listings for insert with check (auth.uid() = user_id);
create policy "Users can update own listings"
  on public.listings for update using (auth.uid() = user_id);
create policy "Users can delete own listings"
  on public.listings for delete using (auth.uid() = user_id);

-- Bookings: renter and lister can view their own
create policy "Users can view own bookings"
  on public.bookings for select
  using (auth.uid() = renter_id or auth.uid() = lister_id);
create policy "Renters can create bookings"
  on public.bookings for insert with check (auth.uid() = renter_id);
create policy "Parties can update booking"
  on public.bookings for update
  using (auth.uid() = renter_id or auth.uid() = lister_id);

-- Reviews: viewable by all, writable by reviewer
create policy "Reviews are viewable by everyone"
  on public.reviews for select using (true);
create policy "Users can insert reviews"
  on public.reviews for insert with check (auth.uid() = reviewer_id);

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists listings_category_idx   on public.listings (category);
create index if not exists listings_location_idx   on public.listings (location);
create index if not exists listings_available_idx  on public.listings (is_available);
create index if not exists bookings_renter_idx     on public.bookings (renter_id);
create index if not exists bookings_lister_idx     on public.bookings (lister_id);
create index if not exists bookings_listing_idx    on public.bookings (listing_id);
create index if not exists listings_published_idx  on public.listings (is_published);
create index if not exists listings_stock_idx      on public.listings (stock_qty);
create index if not exists profiles_admin_idx      on public.profiles (is_admin);
create index if not exists reviews_hidden_idx      on public.reviews (is_hidden);

-- ── Admin helpers + policies ─────────────────────────
create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create policy "Admins can update any profile"
  on public.profiles for update
  using (public.current_user_is_admin());
create policy "Admins can delete any listing"
  on public.listings for delete
  using (public.current_user_is_admin());
create policy "Admins can update any listing"
  on public.listings for update
  using (public.current_user_is_admin());
create policy "Admins can view all bookings"
  on public.bookings for select
  using (public.current_user_is_admin());
create policy "Admins can update any booking"
  on public.bookings for update
  using (public.current_user_is_admin());
create policy "Admins can update reviews"
  on public.reviews for update
  using (public.current_user_is_admin());
create policy "Admins can delete reviews"
  on public.reviews for delete
  using (public.current_user_is_admin());

create policy "Active coupons readable"
  on public.coupons for select
  using (
    (
      is_active = true
      and (owner_id is null or owner_id = auth.uid())
    )
    or public.current_user_is_admin()
  );
create policy "Admins insert coupons"
  on public.coupons for insert
  with check (public.current_user_is_admin());
create policy "Admins update coupons"
  on public.coupons for update
  using (public.current_user_is_admin());
create policy "Admins delete coupons"
  on public.coupons for delete
  using (public.current_user_is_admin());

create policy "Enabled payment methods readable"
  on public.payment_methods for select
  using (is_enabled = true or public.current_user_is_admin());
create policy "Admins update payment methods"
  on public.payment_methods for update
  using (public.current_user_is_admin());
create policy "Admins manage payment methods"
  on public.payment_methods for insert
  with check (public.current_user_is_admin());

create policy "Site settings readable"
  on public.site_settings for select
  using (true);
create policy "Admins update site settings"
  on public.site_settings for update
  using (public.current_user_is_admin());
create policy "Admins insert site settings"
  on public.site_settings for insert
  with check (public.current_user_is_admin());

create or replace function public.bump_coupon_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.coupon_id is not null then
    update public.coupons
    set used_count = used_count + 1, updated_at = now()
    where id = new.coupon_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_booking_coupon_redeemed on public.bookings;
create trigger on_booking_coupon_redeemed
  after insert on public.bookings
  for each row execute procedure public.bump_coupon_usage();

-- ── Storage Buckets ──────────────────────────────────────────
-- Run separately in Supabase Dashboard → Storage:
-- 1. Create bucket "listing-photos" (public)
-- 2. Create bucket "kyc-docs" (private)
--
-- Then run supabase/booking_ops_migration.sql for check-in photos,
-- availability dates, and booking alerts.
-- Then run supabase/kyc_migration.sql for manual KYC + private kyc-docs bucket.
-- Then run supabase/wallet_referral_chat_migration.sql for wallet, referrals, and booking chat.
