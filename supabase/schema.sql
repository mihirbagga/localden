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
  rating        numeric(2,1) default 0,
  total_reviews integer default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
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

  -- Status
  is_available    boolean default true,
  is_verified     boolean default false,
  is_featured     boolean default false,

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

  -- Logistics
  delivery_type   text default 'pickup' check (delivery_type in ('pickup','delivery')),
  delivery_address text,

  -- Notes
  renter_note     text,
  lister_note     text,

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

-- ── Row Level Security ───────────────────────────────────────
alter table public.profiles  enable row level security;
alter table public.listings  enable row level security;
alter table public.bookings  enable row level security;
alter table public.reviews   enable row level security;
alter table public.deposits  enable row level security;

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

-- ── Storage Buckets ──────────────────────────────────────────
-- Run separately in Supabase Dashboard → Storage:
-- 1. Create bucket "listing-photos" (public)
-- 2. Create bucket "kyc-docs" (private)
