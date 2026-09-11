-- ═══════════════════════════════════════════════════════════
-- लोकल Den — Admin Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- 1. Profile admin fields
alter table public.profiles
  add column if not exists is_admin boolean default false;

alter table public.profiles
  add column if not exists admin_role text default 'none';

alter table public.profiles
  add column if not exists is_banned boolean default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_admin_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_admin_role_check
      check (admin_role in ('none', 'admin', 'super_admin'));
  end if;
end $$;

-- 2. Listing stock + visibility
alter table public.listings
  add column if not exists stock_qty integer default 1;

alter table public.listings
  add column if not exists stock_total integer default 1;

alter table public.listings
  add column if not exists is_published boolean default true;

update public.listings set stock_qty = 1 where stock_qty is null;
update public.listings set stock_total = 1 where stock_total is null;
update public.listings set is_published = true where is_published is null;

-- 3. Review moderation
alter table public.reviews
  add column if not exists is_hidden boolean default false;

update public.reviews set is_hidden = false where is_hidden is null;

-- 4. Bootstrap yourself as overall admin — replace email
-- UPDATE public.profiles
--   SET is_admin = true, admin_role = 'super_admin'
--   WHERE email = 'your@email.com';

-- 5. Security-definer helper (avoids RLS recursion)
create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select p.is_admin
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  );
$$;

create or replace function public.current_user_is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select p.admin_role = 'super_admin'
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  );
$$;

-- 6. Replace recursive admin policies
drop policy if exists "Admins can update any profile" on public.profiles;
drop policy if exists "Admins can delete any listing" on public.listings;
drop policy if exists "Admins can update any listing" on public.listings;
drop policy if exists "Admins can view all bookings" on public.bookings;
drop policy if exists "Admins can update any booking" on public.bookings;
drop policy if exists "Admins can update reviews" on public.reviews;
drop policy if exists "Admins can delete reviews" on public.reviews;

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

-- 7. Indexes
create index if not exists listings_published_idx on public.listings (is_published);
create index if not exists listings_stock_idx on public.listings (stock_qty);
create index if not exists profiles_admin_idx on public.profiles (is_admin);
create index if not exists reviews_hidden_idx on public.reviews (is_hidden);
