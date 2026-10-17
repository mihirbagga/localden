-- ═══════════════════════════════════════════════════════════
-- LocalDen — Secure booking & payments
--
--  1. Atomic booking:  create_booking()  (one transaction: price, coupon,
--     slot, booking row, wallet spend, stock, counters)
--  2. Server-side money: quote_booking() / create_booking() compute every
--     rupee from listings + site_settings + coupons. The browser only displays.
--  3. Manual payment verification: UTR required, payment_status 'submitted'
--     until an admin (or the lister, for cash) confirms / rejects it.
--  4. RLS review fixes: no direct booking inserts, locked money columns,
--     status-transition rules, wallet functions no longer callable by users,
--     listing self-verify/feature blocked, reviews only for completed bookings.
--
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- Needs: schema.sql, booking_ops_migration.sql, wallet_referral_chat_migration.sql
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════

-- ── 0. Helpers ───────────────────────────────────────────────
create or replace function public._num(p text, p_default numeric)
returns numeric
language plpgsql
immutable
as $$
begin
  return coalesce(nullif(trim(p), '')::numeric, p_default);
exception when others then
  return p_default;
end;
$$;

-- ── 1. Columns ───────────────────────────────────────────────
alter table public.bookings add column if not exists duration_discount integer default 0;
alter table public.bookings add column if not exists coupon_discount integer default 0;
alter table public.bookings add column if not exists protection_plan text default 'none';
alter table public.bookings add column if not exists insurance_opted boolean default false;
alter table public.bookings add column if not exists insurance_amount integer default 0;
alter table public.bookings add column if not exists payment_submitted_at timestamptz;
alter table public.bookings add column if not exists payment_confirmed_at timestamptz;
alter table public.bookings add column if not exists payment_confirmed_by uuid references public.profiles(id) on delete set null;
alter table public.bookings add column if not exists payment_note text;

-- payment_status gains 'submitted' (renter says "I paid", waiting for verification)
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.bookings'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%payment_status%'
  loop
    execute format('alter table public.bookings drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.bookings
  add constraint bookings_payment_status_check
  check (payment_status in ('pending', 'submitted', 'paid', 'refunded', 'failed'));

-- A UTR / Razorpay payment id can only back one live booking
do $$
begin
  create unique index if not exists bookings_payment_ref_once_idx
    on public.bookings (upper(payment_ref))
    where payment_ref is not null and payment_status in ('submitted', 'paid');
exception when unique_violation then
  raise notice 'bookings_payment_ref_once_idx skipped: duplicate payment_ref values already exist';
end $$;

do $$
begin
  create unique index if not exists bookings_razorpay_payment_once_idx
    on public.bookings (razorpay_payment_id)
    where razorpay_payment_id is not null;
exception when unique_violation then
  raise notice 'bookings_razorpay_payment_once_idx skipped: duplicate razorpay ids already exist';
end $$;

-- Existing manual bookings that never got verified go to the admin queue
update public.bookings
set payment_status = 'submitted',
    payment_submitted_at = coalesce(payment_submitted_at, created_at)
where payment_status = 'pending'
  and payment_method in ('qr', 'upi', 'bank', 'razorpay')
  and status in ('pending', 'confirmed', 'active');

-- ── 2. Pricing (single source of truth) ──────────────────────
create or replace function public._booking_quote(
  p_listing_id uuid,
  p_start date,
  p_end date,
  p_coupon_code text,
  p_plan text,
  p_user uuid,
  p_lock boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.listings%rowtype;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_days int;
  v_subtotal int;
  v_rate numeric := 0;
  v_dur int;
  v_after_dur int;
  v_code text := upper(trim(coalesce(p_coupon_code, '')));
  v_coupon public.coupons%rowtype;
  v_coupon_found boolean := false;
  v_coupon_err text;
  v_coupon_off int := 0;
  v_net int;
  v_fee_cfg jsonb;
  v_fee_on boolean;
  v_fee_type text;
  v_fee_val numeric;
  v_fee int := 0;
  v_deposit int;
  v_prot_cfg jsonb;
  v_plan text := lower(coalesce(nullif(trim(p_plan), ''), 'none'));
  v_prot int := 0;
begin
  if p_start is null or p_end is null then
    raise exception 'Pick rental dates first.';
  end if;
  if p_end <= p_start then
    raise exception 'End date must be after the start date.';
  end if;
  if p_start < v_today then
    raise exception 'Start date cannot be in the past.';
  end if;
  if v_plan not in ('none', 'basic', 'full') then
    raise exception 'Unknown protection plan.';
  end if;

  select * into v_listing from public.listings where id = p_listing_id;
  if not found then
    raise exception 'Listing not found.';
  end if;

  v_days := p_end - p_start;
  if v_days > 365 then
    raise exception 'Rentals are limited to 365 days.';
  end if;

  v_subtotal := v_days * v_listing.price_day;

  if v_days >= 14 then v_rate := 0.20;
  elsif v_days >= 7 then v_rate := 0.10;
  elsif v_days >= 3 then v_rate := 0.05;
  end if;
  v_dur := round(v_subtotal * v_rate)::int;
  v_after_dur := v_subtotal - v_dur;

  -- Coupon (never trust the browser's discount)
  if v_code <> '' then
    if p_lock then
      select * into v_coupon from public.coupons where upper(code) = v_code for update;
    else
      select * into v_coupon from public.coupons where upper(code) = v_code;
    end if;
    v_coupon_found := found;

    if not v_coupon_found then
      v_coupon_err := 'Coupon not found.';
    elsif not v_coupon.is_active then
      v_coupon_err := 'Coupon is inactive.';
    elsif v_coupon.starts_at is not null and v_coupon.starts_at > now() then
      v_coupon_err := 'Coupon not started yet.';
    elsif v_coupon.ends_at is not null and v_coupon.ends_at < now() then
      v_coupon_err := 'Coupon expired.';
    elsif v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
      v_coupon_err := 'Coupon usage limit reached.';
    elsif v_coupon.owner_id is not null and v_coupon.owner_id is distinct from p_user then
      v_coupon_err := 'This welcome coupon is for another account.';
    elsif coalesce(v_coupon.min_subtotal, 0) > 0 and v_subtotal < v_coupon.min_subtotal then
      v_coupon_err := 'Min rental ₹' || v_coupon.min_subtotal || ' required.';
    else
      if v_coupon.discount_type = 'percent' then
        v_coupon_off := round(v_after_dur * v_coupon.discount_value / 100.0)::int;
        if coalesce(v_coupon.max_discount, 0) > 0 then
          v_coupon_off := least(v_coupon_off, v_coupon.max_discount);
        end if;
      else
        v_coupon_off := v_coupon.discount_value;
      end if;
      v_coupon_off := greatest(0, least(v_coupon_off, v_after_dur));
    end if;
  end if;

  v_net := greatest(0, v_after_dur - v_coupon_off);

  -- Platform fee (site_settings.platform_fee)
  select value into v_fee_cfg from public.site_settings where id = 'platform_fee';
  v_fee_cfg := coalesce(v_fee_cfg, '{}'::jsonb);
  v_fee_on := coalesce((v_fee_cfg ->> 'enabled')::boolean, true);
  v_fee_type := case when v_fee_cfg ->> 'fee_type' = 'flat' then 'flat' else 'percent' end;
  v_fee_val := public._num(v_fee_cfg ->> 'fee_value', 20);
  if v_fee_on and v_fee_val > 0 then
    if v_fee_type = 'flat' then
      v_fee := round(v_fee_val)::int;
    else
      v_fee := round(v_net * v_fee_val / 100.0)::int;
    end if;
  end if;

  v_deposit := coalesce(v_listing.deposit_amount, 0);

  -- Damage protection (site_settings.protection_plans)
  select value into v_prot_cfg from public.site_settings where id = 'protection_plans';
  v_prot_cfg := coalesce(v_prot_cfg, '{}'::jsonb);
  if not coalesce((v_prot_cfg ->> 'enabled')::boolean, true) then
    v_plan := 'none';
  end if;
  if v_plan = 'basic' then
    v_prot := round(public._num(v_prot_cfg ->> 'basic_fee_per_day', 99) * v_days)::int;
  elsif v_plan = 'full' then
    v_prot := round(public._num(v_prot_cfg ->> 'full_fee_per_day', 249) * v_days)::int;
  end if;

  return jsonb_build_object(
    'days', v_days,
    'price_day', v_listing.price_day,
    'subtotal', v_subtotal,
    'duration_discount_pct', round(v_rate * 100)::int,
    'duration_discount', v_dur,
    'coupon_id', case when v_coupon_found and v_coupon_err is null then v_coupon.id end,
    'coupon_code', case when v_coupon_found and v_coupon_err is null then v_coupon.code end,
    'coupon_discount', v_coupon_off,
    'coupon_error', v_coupon_err,
    'discount_total', v_dur + v_coupon_off,
    'net_rent', v_net,
    'platform_fee', v_fee,
    'fee_enabled', v_fee_on,
    'fee_type', v_fee_type,
    'fee_value', v_fee_val,
    'deposit', v_deposit,
    'protection_plan', v_plan,
    'protection_cost', v_prot,
    'total', v_net + v_fee + v_deposit + v_prot
  );
end;
$$;

-- Public read-only price quote (what the checkout screen displays)
create or replace function public.quote_booking(
  p_listing_id uuid,
  p_start_date date,
  p_end_date date,
  p_coupon_code text default null,
  p_protection_plan text default 'none'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public._booking_quote(
    p_listing_id, p_start_date, p_end_date,
    p_coupon_code, p_protection_plan, auth.uid(), false
  );
end;
$$;

-- ── 3. Atomic booking ────────────────────────────────────────
create or replace function public.create_booking(
  p_listing_id uuid,
  p_start_date date,
  p_end_date date,
  p_payment_method text,
  p_payment_ref text default null,
  p_razorpay_payment_id text default null,
  p_coupon_code text default null,
  p_protection_plan text default 'none',
  p_delivery_type text default 'pickup',
  p_delivery_address text default null,
  p_expected_total integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile record;
  v_listing public.listings%rowtype;
  v_q jsonb;
  v_total int;
  v_id uuid := gen_random_uuid();
  v_method_id text := lower(trim(coalesce(p_payment_method, '')));
  v_pm public.payment_methods%rowtype;
  v_type text;
  v_pay_status text;
  v_ref text := null;
  v_rzp text := null;
  v_delivery text := case when p_delivery_type = 'delivery' then 'delivery' else 'pickup' end;
  v_address text := nullif(trim(coalesce(p_delivery_address, '')), '');
  v_qty int;
begin
  if v_uid is null then
    raise exception 'Sign in to book.';
  end if;

  -- everything below runs as one transaction; mark it as trusted for guard triggers
  perform set_config('localden.booking_write', '1', true);

  select is_banned, kyc_status, is_admin, admin_role
    into v_profile
  from public.profiles
  where id = v_uid;
  if not found then
    raise exception 'Profile not found. Sign out and in again.';
  end if;
  if coalesce(v_profile.is_banned, false) then
    raise exception 'Account banned. Contact support.';
  end if;
  if v_profile.kyc_status = 'required'
     and not (coalesce(v_profile.is_admin, false) or v_profile.admin_role in ('admin', 'super_admin')) then
    raise exception 'Complete KYC before renting.';
  end if;

  -- Serialise bookings per listing (makes the slot guard race-free)
  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found then
    raise exception 'Listing not found.';
  end if;
  if v_listing.user_id = v_uid then
    raise exception 'You cannot rent your own listing.';
  end if;
  if coalesce(v_listing.is_published, true) = false or coalesce(v_listing.is_available, true) = false then
    raise exception 'This listing is not currently available.';
  end if;

  if v_delivery = 'delivery' and (v_address is null or char_length(v_address) < 5) then
    raise exception 'Add a delivery address.';
  end if;
  if v_delivery = 'pickup' then
    v_address := null;
  end if;

  -- Price: always from the database
  v_q := public._booking_quote(
    p_listing_id, p_start_date, p_end_date,
    p_coupon_code, p_protection_plan, v_uid, true
  );
  if nullif(trim(coalesce(p_coupon_code, '')), '') is not null and v_q ->> 'coupon_error' is not null then
    raise exception '%', v_q ->> 'coupon_error';
  end if;
  v_total := (v_q ->> 'total')::int;
  if p_expected_total is not null and abs(p_expected_total - v_total) > 2 then
    raise exception 'PRICE_CHANGED: the total is now ₹% (you saw ₹%). Review and try again.', v_total, p_expected_total;
  end if;

  -- Payment method
  if v_method_id = 'wallet' then
    v_type := 'wallet';
    v_pay_status := 'pending';
  else
    select * into v_pm from public.payment_methods where id = v_method_id and is_enabled = true;
    if not found then
      raise exception 'That payment method is not available.';
    end if;
    v_type := v_pm.method_type;

    if v_type in ('qr', 'upi', 'bank') then
      v_ref := upper(regexp_replace(coalesce(p_payment_ref, ''), '\s', '', 'g'));
      if v_ref !~ '^[A-Z0-9]{8,30}$' then
        raise exception 'Enter the UTR / transaction ID from your payment app (8-30 letters or digits).';
      end if;
      v_pay_status := 'submitted';
    elsif v_type = 'razorpay' then
      v_rzp := trim(coalesce(p_razorpay_payment_id, ''));
      if v_rzp !~ '^pay_[A-Za-z0-9]{6,}$' then
        raise exception 'Razorpay payment id is missing or invalid.';
      end if;
      -- Never auto-trusted: an admin verifies it against the Razorpay dashboard
      v_pay_status := 'submitted';
    else
      v_pay_status := 'pending'; -- cash on pickup
    end if;
  end if;

  begin
    insert into public.bookings (
      id, listing_id, renter_id, lister_id,
      start_date, end_date, total_days,
      price_per_day, subtotal, platform_fee, deposit,
      discount_amount, duration_discount, coupon_discount,
      coupon_id, coupon_code,
      total_amount, status,
      payment_status, payment_method, payment_ref, razorpay_payment_id, payment_submitted_at,
      delivery_type, delivery_address,
      insurance_opted, insurance_amount, protection_plan
    ) values (
      v_id, v_listing.id, v_uid, v_listing.user_id,
      p_start_date, p_end_date, (v_q ->> 'days')::int,
      (v_q ->> 'price_day')::int, (v_q ->> 'subtotal')::int, (v_q ->> 'platform_fee')::int, (v_q ->> 'deposit')::int,
      (v_q ->> 'discount_total')::int, (v_q ->> 'duration_discount')::int, (v_q ->> 'coupon_discount')::int,
      nullif(v_q ->> 'coupon_id', '')::uuid, v_q ->> 'coupon_code',
      v_total, 'pending',
      v_pay_status, v_method_id, v_ref, v_rzp,
      case when v_pay_status = 'submitted' then now() end,
      v_delivery, v_address,
      (v_q ->> 'protection_cost')::int > 0, (v_q ->> 'protection_cost')::int, v_q ->> 'protection_plan'
    );
  exception when unique_violation then
    raise exception 'That payment reference was already used on another booking.';
  end;

  -- Wallet: spend inside the same transaction
  if v_type = 'wallet' then
    perform public.spend_wallet(v_total, v_id);
    update public.bookings
    set payment_status = 'paid',
        payment_confirmed_at = now(),
        updated_at = now()
    where id = v_id;
    v_pay_status := 'paid';
  end if;

  -- Counters
  update public.listings
  set total_bookings = coalesce(total_bookings, 0) + 1,
      updated_at = now()
  where id = v_listing.id;

  return v_q || jsonb_build_object(
    'booking_id', v_id,
    'status', 'pending',
    'payment_status', v_pay_status,
    'payment_method', v_method_id
  );
end;
$$;

-- ── 4. Manual payment verification ───────────────────────────
create or replace function public.confirm_booking_payment(
  p_booking_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  b public.bookings%rowtype;
  v_admin boolean := public.current_user_is_admin();
begin
  if v_uid is null then
    raise exception 'Sign in first.';
  end if;
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found.';
  end if;
  if b.payment_status = 'paid' then
    return;
  end if;
  if b.payment_status not in ('pending', 'submitted') then
    raise exception 'This payment cannot be confirmed (status: %).', b.payment_status;
  end if;
  if b.status = 'cancelled' then
    raise exception 'This booking is cancelled.';
  end if;
  -- Platform-collected money (QR / UPI / bank / Razorpay): admin only.
  -- Cash handed over at pickup: the lister can confirm.
  if not v_admin and not (v_uid = b.lister_id and b.payment_method = 'cash') then
    raise exception 'Only an admin can verify this payment.';
  end if;

  perform set_config('localden.booking_write', '1', true);
  update public.bookings
  set payment_status = 'paid',
      payment_confirmed_at = now(),
      payment_confirmed_by = v_uid,
      payment_note = coalesce(nullif(trim(coalesce(p_note, '')), ''), payment_note),
      updated_at = now()
  where id = b.id;

  perform public.push_notification(
    b.renter_id, b.id, 'payment_confirmed',
    'Payment verified',
    'Your payment of ₹' || b.total_amount || ' was verified.',
    '/dashboard?tab=bookings'
  );
end;
$$;

create or replace function public.reject_booking_payment(
  p_booking_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  b public.bookings%rowtype;
  v_admin boolean := public.current_user_is_admin();
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if v_uid is null then
    raise exception 'Sign in first.';
  end if;
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found.';
  end if;
  if b.payment_status not in ('pending', 'submitted') then
    raise exception 'Only unpaid bookings can be rejected (status: %).', b.payment_status;
  end if;
  if not v_admin and not (v_uid = b.lister_id and b.payment_method = 'cash') then
    raise exception 'Only an admin can reject this payment.';
  end if;

  perform set_config('localden.booking_write', '1', true);
  update public.bookings
  set payment_status = 'failed',
      status = case when status in ('pending', 'confirmed', 'active') then 'cancelled' else status end,
      payment_note = coalesce(v_reason, payment_note),
      updated_at = now()
  where id = b.id;

  perform public.push_notification(
    b.renter_id, b.id, 'payment_rejected',
    'Payment not verified',
    coalesce(v_reason, 'We could not find your payment, so the booking was cancelled.'),
    '/dashboard?tab=bookings'
  );
end;
$$;

-- ── 5. Date-wise availability: drop old stock depletion trigger ──
drop trigger if exists bookings_restore_stock on public.bookings;
drop function if exists public.restore_stock_on_booking_end();

-- ── 6. RLS review: bookings ──────────────────────────────────
-- Bookings can only be created through create_booking().
drop policy if exists "Renters can create bookings" on public.bookings;

-- Parties may still UPDATE, but only status / notes, along legal transitions.
create or replace function public.guard_booking_update()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_ok boolean := false;
  v_free text[] := array['status', 'updated_at', 'renter_note', 'lister_note'];
  v_cash boolean := (old.payment_method = 'cash');
begin
  if current_setting('localden.booking_write', true) = '1' then
    return new;
  end if;
  -- SQL editor / service role have no end-user
  if v_uid is null then
    return new;
  end if;
  if public.current_user_is_admin() then
    return new;
  end if;

  if v_uid = old.renter_id then
    v_role := 'renter';
  elsif v_uid = old.lister_id then
    v_role := 'lister';
  else
    raise exception 'Not allowed to change this booking.' using errcode = '42501';
  end if;

  if (to_jsonb(new) - v_free) is distinct from (to_jsonb(old) - v_free) then
    raise exception 'Price, dates and payment details of a booking cannot be edited.'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    v_ok := case
      when v_role = 'lister' and old.status = 'pending' and new.status in ('confirmed', 'cancelled') then true
      when v_role = 'renter' and old.status = 'pending' and new.status = 'cancelled' then true
      when v_role = 'lister' and old.status in ('confirmed', 'active') and new.status = 'cancelled' then true
      when old.status = 'confirmed' and new.status = 'active' then true
      when v_role = 'lister' and old.status = 'active' and new.status = 'completed' then true
      when old.status in ('confirmed', 'active', 'completed') and new.status = 'disputed' then true
      else false
    end;
    if not v_ok then
      raise exception 'A booking cannot move from % to % (as %).', old.status, new.status, v_role
        using errcode = '42501';
    end if;
    if new.status in ('confirmed', 'active')
       and old.payment_status is distinct from 'paid' and not v_cash then
      raise exception 'Payment is not verified yet. An admin must verify it first.'
        using errcode = '42501';
    end if;
    if new.status = 'completed' and old.payment_status is distinct from 'paid' then
      raise exception 'Mark the payment as received before completing the booking.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_guard_update on public.bookings;
create trigger bookings_guard_update
  before update on public.bookings
  for each row execute procedure public.guard_booking_update();

-- ── 7. RLS review: listings ──────────────────────────────────
-- Owners edit their listing but cannot self-verify, self-feature or fake ratings.
create or replace function public.guard_listing_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('localden.booking_write', true) = '1' then
    return new;
  end if;
  if auth.uid() is null or public.current_user_is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_verified := false;
    new.is_featured := false;
    new.rating := 0;
    new.total_reviews := 0;
    new.total_bookings := 0;
  else
    new.is_verified := old.is_verified;
    new.is_featured := old.is_featured;
    new.rating := old.rating;
    new.total_reviews := old.total_reviews;
    new.total_bookings := old.total_bookings;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_guard_write on public.listings;
create trigger listings_guard_write
  before insert or update on public.listings
  for each row execute procedure public.guard_listing_write();

-- ── 8. RLS review: reviews only for completed bookings ───────
drop policy if exists "Users can insert reviews" on public.reviews;
create policy "Users can insert reviews"
  on public.reviews for insert
  with check (
    auth.uid() = reviewer_id
    and exists (
      select 1
      from public.bookings b
      where b.id = reviews.booking_id
        and b.listing_id = reviews.listing_id
        and b.status = 'completed'
        and auth.uid() in (b.renter_id, b.lister_id)
    )
  );

do $$
begin
  create unique index if not exists reviews_one_per_booking_reviewer_idx
    on public.reviews (booking_id, reviewer_id);
exception when unique_violation then
  raise notice 'reviews_one_per_booking_reviewer_idx skipped: duplicate reviews already exist';
end $$;

-- ── 9. RLS review: money functions must not be callable by users ──
-- These are SECURITY DEFINER helpers. Supabase grants EXECUTE to anon/authenticated
-- by default, which would let anyone call e.g. post_wallet() and credit themselves.
do $$ begin
  revoke execute on function public.post_wallet(uuid, integer, text, uuid, uuid, text) from public, anon, authenticated;
exception when undefined_function then raise notice 'post_wallet not found - skipped'; end $$;

do $$ begin
  revoke execute on function public.spend_wallet(integer, uuid) from public, anon, authenticated;
exception when undefined_function then raise notice 'spend_wallet not found - skipped'; end $$;

do $$ begin
  revoke execute on function public.ensure_wallet(uuid) from public, anon, authenticated;
exception when undefined_function then raise notice 'ensure_wallet not found - skipped'; end $$;

do $$ begin
  revoke execute on function public.make_referral_code(text, uuid) from public, anon, authenticated;
exception when undefined_function then raise notice 'make_referral_code not found - skipped'; end $$;

revoke all on function public._num(text, numeric) from public, anon, authenticated;
revoke all on function public._booking_quote(uuid, date, date, text, text, uuid, boolean) from public, anon, authenticated;

revoke all on function public.quote_booking(uuid, date, date, text, text) from public;
grant execute on function public.quote_booking(uuid, date, date, text, text) to anon, authenticated;

revoke all on function public.create_booking(uuid, date, date, text, text, text, text, text, text, text, integer) from public, anon;
grant execute on function public.create_booking(uuid, date, date, text, text, text, text, text, text, text, integer) to authenticated;

revoke all on function public.confirm_booking_payment(uuid, text) from public, anon;
grant execute on function public.confirm_booking_payment(uuid, text) to authenticated;

revoke all on function public.reject_booking_payment(uuid, text) from public, anon;
grant execute on function public.reject_booking_payment(uuid, text) to authenticated;

-- Let PostgREST see the new functions immediately
notify pgrst, 'reload schema';
