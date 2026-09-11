-- ═══════════════════════════════════════════════════════════
-- लोकल Den — Coupons
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- Needs current_user_is_admin() from admin_migration.sql
-- ═══════════════════════════════════════════════════════════

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
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create unique index if not exists coupons_code_upper_idx
  on public.coupons (upper(code));

alter table public.bookings
  add column if not exists coupon_id uuid references public.coupons(id) on delete set null;

alter table public.bookings
  add column if not exists coupon_code text;

alter table public.bookings
  add column if not exists discount_amount integer default 0;

alter table public.coupons enable row level security;

drop policy if exists "Active coupons readable" on public.coupons;
drop policy if exists "Admins insert coupons" on public.coupons;
drop policy if exists "Admins update coupons" on public.coupons;
drop policy if exists "Admins delete coupons" on public.coupons;

create policy "Active coupons readable"
  on public.coupons for select
  using (is_active = true or public.current_user_is_admin());

create policy "Admins insert coupons"
  on public.coupons for insert
  with check (public.current_user_is_admin());

create policy "Admins update coupons"
  on public.coupons for update
  using (public.current_user_is_admin());

create policy "Admins delete coupons"
  on public.coupons for delete
  using (public.current_user_is_admin());

create or replace function public.bump_coupon_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.coupon_id is not null then
    update public.coupons
    set used_count = used_count + 1,
        updated_at = now()
    where id = new.coupon_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_booking_coupon_redeemed on public.bookings;
create trigger on_booking_coupon_redeemed
  after insert on public.bookings
  for each row execute procedure public.bump_coupon_usage();

create index if not exists bookings_coupon_idx on public.bookings (coupon_id);
create index if not exists coupons_active_idx on public.coupons (is_active);
