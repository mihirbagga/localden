-- ═══════════════════════════════════════════════════════════
-- लोकल Den — listings: add every missing column
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- Safe to re-run. ADD COLUMN IF NOT EXISTS.
-- ═══════════════════════════════════════════════════════════

-- Core
alter table public.listings add column if not exists user_id uuid;
alter table public.listings add column if not exists title text;
alter table public.listings add column if not exists description text;
alter table public.listings add column if not exists category text;
alter table public.listings add column if not exists subcategory text;
alter table public.listings add column if not exists condition text default 'good';
alter table public.listings add column if not exists brand text;
alter table public.listings add column if not exists model text;

-- Pricing
alter table public.listings add column if not exists price_day integer;
alter table public.listings add column if not exists price_weekend integer;
alter table public.listings add column if not exists price_week integer;
alter table public.listings add column if not exists deposit_amount integer default 5000;

-- Location
alter table public.listings add column if not exists location text;
alter table public.listings add column if not exists area text;
alter table public.listings add column if not exists lat numeric;
alter table public.listings add column if not exists lng numeric;

-- Media
alter table public.listings add column if not exists photos text[] default '{}';
alter table public.listings add column if not exists emoji text default '🎮';

-- Inventory (admin stock tab needs these)
alter table public.listings add column if not exists stock_qty integer default 1;
alter table public.listings add column if not exists stock_total integer default 1;

-- Status / visibility
alter table public.listings add column if not exists is_available boolean default true;
alter table public.listings add column if not exists is_verified boolean default false;
alter table public.listings add column if not exists is_featured boolean default false;
alter table public.listings add column if not exists is_published boolean default true;

-- Contact
alter table public.listings add column if not exists contact_phone text;
alter table public.listings add column if not exists contact_method text default 'app';

-- Stats
alter table public.listings add column if not exists total_bookings integer default 0;
alter table public.listings add column if not exists rating numeric(2,1) default 0;
alter table public.listings add column if not exists total_reviews integer default 0;

-- Timestamps
alter table public.listings add column if not exists created_at timestamptz default now();
alter table public.listings add column if not exists updated_at timestamptz default now();

-- Backfill nulls on new inventory / flags
update public.listings set stock_qty = 1 where stock_qty is null;
update public.listings set stock_total = greatest(coalesce(stock_total, 1), coalesce(stock_qty, 1)) where stock_total is null or stock_total < coalesce(stock_qty, 1);
update public.listings set is_published = true where is_published is null;
update public.listings set is_available = true where is_available is null;
update public.listings set is_verified = false where is_verified is null;
update public.listings set is_featured = false where is_featured is null;
update public.listings set deposit_amount = 5000 where deposit_amount is null;
update public.listings set photos = '{}' where photos is null;
update public.listings set emoji = '🎮' where emoji is null;
update public.listings set total_bookings = 0 where total_bookings is null;
update public.listings set rating = 0 where rating is null;
update public.listings set total_reviews = 0 where total_reviews is null;
update public.listings set contact_method = 'app' where contact_method is null;
update public.listings set updated_at = now() where updated_at is null;

-- Indexes used by browse + admin
create index if not exists listings_category_idx on public.listings (category);
create index if not exists listings_location_idx on public.listings (location);
create index if not exists listings_available_idx on public.listings (is_available);
create index if not exists listings_published_idx on public.listings (is_published);
create index if not exists listings_stock_idx on public.listings (stock_qty);
create index if not exists listings_featured_idx on public.listings (is_featured);

-- Confirm columns
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'listings'
order by ordinal_position;
