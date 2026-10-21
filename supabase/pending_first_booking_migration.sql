-- ═══════════════════════════════════════════════════════════
-- LocalDen — Pending-first booking, slot hold & wallet split
--
--  1. Slot hold:   online-payment bookings are created FIRST (status
--     'pending', payment 'pending') and hold the dates for a few minutes
--     (hold_expires_at). Expired holds stop blocking dates automatically.
--  2. Wallet split: create_booking() spends any wallet portion server-side
--     and only asks the gateway for the remainder.
--  3. Server-confirmed payment: the browser can no longer mark a Razorpay
--     booking as paid. Only confirm_booking_payment_system() (service role,
--     called by the razorpay-verify / razorpay-webhook edge functions) can.
--  4. Delivery fee is accepted from the client but clamped to the admin max.
--
-- NOTE: this REPLACES create_booking() from secure_booking_migration.sql and
-- date_wise_availability_migration.sql (both defined the same signature).
-- Run it AFTER those files.
-- Run in: Supabase Dashboard → SQL Editor → New Query. Safe to re-run.
-- ═══════════════════════════════════════════════════════════

-- ── 1. Columns ───────────────────────────────────────────────
alter table public.bookings add column if not exists hold_expires_at timestamptz;
alter table public.bookings add column if not exists razorpay_order_id text;
alter table public.bookings add column if not exists wallet_amount numeric default 0;
alter table public.bookings add column if not exists paid_amount numeric default 0;
alter table public.bookings add column if not exists delivery_fee numeric default 0;
alter table public.bookings add column if not exists delivery_distance_km numeric default 0;
alter table public.bookings add column if not exists warehouse_note text;

create index if not exists bookings_hold_idx
  on public.bookings (hold_expires_at)
  where hold_expires_at is not null and payment_status = 'pending';

do $$
begin
  create unique index if not exists bookings_razorpay_order_once_idx
    on public.bookings (razorpay_order_id)
    where razorpay_order_id is not null;
exception when unique_violation then
  raise notice 'bookings_razorpay_order_once_idx skipped: duplicate order ids exist';
end $$;

-- ── 2. "Does this booking block its dates?" (single source of truth) ──
create or replace function public._booking_blocks_dates(
  p_status text,
  p_payment_status text,
  p_hold_expires_at timestamptz
)
returns boolean
language sql
stable
as $$
  select p_status in ('pending', 'confirmed', 'active')
     and not (
       p_payment_status = 'pending'
       and p_hold_expires_at is not null
       and p_hold_expires_at < now()
     );
$$;

create or replace function public.assert_booking_slot_open()
returns trigger
language plpgsql
as $$
declare
  v_units int;
  v_taken int;
begin
  if new.status in ('cancelled', 'completed', 'disputed') then
    return new;
  end if;

  select greatest(coalesce(nullif(stock_total, 0), nullif(stock_qty, 0), 1), 1)
    into v_units
  from public.listings
  where id = new.listing_id;

  select count(*) into v_taken
  from public.bookings b
  where b.listing_id = new.listing_id
    and b.id is distinct from new.id
    and public._booking_blocks_dates(b.status, b.payment_status, b.hold_expires_at)
    and b.start_date < new.end_date
    and b.end_date > new.start_date;

  if v_taken >= v_units then
    raise exception 'Those dates are already booked'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create or replace function public.get_listing_booked_ranges(p_listing_id uuid)
returns table (start_date date, end_date date, status text)
language sql
stable
security definer
set search_path = public
as $$
  select b.start_date, b.end_date, b.status
  from public.bookings b
  where b.listing_id = p_listing_id
    and public._booking_blocks_dates(b.status, b.payment_status, b.hold_expires_at)
  order by b.start_date asc;
$$;

create or replace view public.listing_busy_ranges
with (security_invoker = false) as
select listing_id, start_date, end_date, status
from public.bookings
where public._booking_blocks_dates(status, payment_status, hold_expires_at);

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
     and public._booking_blocks_dates(b.status, b.payment_status, b.hold_expires_at)
     and b.start_date <= d.d
     and b.end_date > d.d
    group by d.d
  )
  select t.day from taken t where t.cnt >= v_units;
end;
$$;

-- ── 3. Releasing holds ───────────────────────────────────────
-- Cancels expired unpaid holds and gives any wallet portion back.
create or replace function public.release_expired_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n integer := 0;
begin
  perform set_config('localden.booking_write', '1', true);
  for r in
    select id, renter_id, listing_id, coalesce(wallet_amount, 0) as wallet_amount
    from public.bookings
    where status = 'pending'
      and payment_status = 'pending'
      and hold_expires_at is not null
      and hold_expires_at < now()
    for update skip locked
  loop
    update public.bookings
    set status = 'cancelled',
        payment_status = 'failed',
        payment_note = 'Payment window expired',
        hold_expires_at = null,
        updated_at = now()
    where id = r.id;

    if r.wallet_amount > 0 then
      perform public.post_wallet(
        r.renter_id, r.wallet_amount::int, 'refund', r.id, null,
        'Refund: payment window expired'
      );
    end if;

    update public.listings
    set total_bookings = greatest(0, coalesce(total_bookings, 0) - 1)
    where id = r.listing_id;

    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Renter gives the dates back (closed the payment window, changed their mind)
create or replace function public.cancel_pending_hold(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  b public.bookings%rowtype;
begin
  if v_uid is null then
    raise exception 'Sign in first.';
  end if;
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or b.renter_id <> v_uid then
    raise exception 'Booking not found.';
  end if;
  if b.status <> 'pending' or b.payment_status <> 'pending' or b.hold_expires_at is null then
    return; -- nothing to release (already paid / cancelled)
  end if;

  perform set_config('localden.booking_write', '1', true);
  update public.bookings
  set status = 'cancelled',
      payment_status = 'failed',
      payment_note = 'Released by renter before payment',
      hold_expires_at = null,
      updated_at = now()
  where id = b.id;

  if coalesce(b.wallet_amount, 0) > 0 then
    perform public.post_wallet(
      b.renter_id, b.wallet_amount::int, 'refund', b.id, null,
      'Refund: booking released before payment'
    );
  end if;

  update public.listings
  set total_bookings = greatest(0, coalesce(total_bookings, 0) - 1)
  where id = b.listing_id;
end;
$$;

-- ── 4. Atomic, pending-first booking ─────────────────────────
drop function if exists public.create_booking(uuid, date, date, text, text, text, text, text, text, text, integer);
drop function if exists public.create_booking(uuid, date, date, text, text, text, text, text, text, text, integer, boolean, integer, numeric, text);

create or replace function public.create_booking(
  p_listing_id uuid,
  p_start_date date,
  p_end_date date,
  p_payment_method text,
  p_payment_ref text default null,
  p_coupon_code text default null,
  p_protection_plan text default 'none',
  p_delivery_type text default 'pickup',
  p_delivery_address text default null,
  p_expected_total integer default null,
  p_use_wallet boolean default false,
  p_delivery_fee integer default 0,
  p_delivery_distance_km numeric default 0,
  p_warehouse_note text default null
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
  v_quote_total int;
  v_total int;
  v_id uuid := gen_random_uuid();
  v_method_id text := lower(trim(coalesce(p_payment_method, '')));
  v_stored_method text;
  v_pm public.payment_methods%rowtype;
  v_type text;
  v_pay_status text := 'pending';
  v_ref text := null;
  v_delivery text := case when p_delivery_type = 'delivery' then 'delivery' else 'pickup' end;
  v_address text := nullif(trim(coalesce(p_delivery_address, '')), '');
  v_dfee int := 0;
  v_dmax int;
  v_wallet int := 0;
  v_bal int;
  v_remaining int;
  v_hold_min int;
  v_hold_until timestamptz := null;
  v_requires_payment boolean := false;
  v_cfg jsonb;
begin
  if v_uid is null then
    raise exception 'Sign in to book.';
  end if;

  perform set_config('localden.booking_write', '1', true);

  -- free dates held by abandoned checkouts before we check availability
  perform public.release_expired_holds();

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

  -- Price: rental/fee/deposit/protection always come from the database
  v_q := public._booking_quote(
    p_listing_id, p_start_date, p_end_date,
    p_coupon_code, p_protection_plan, v_uid, true
  );
  if nullif(trim(coalesce(p_coupon_code, '')), '') is not null and v_q ->> 'coupon_error' is not null then
    raise exception '%', v_q ->> 'coupon_error';
  end if;
  v_quote_total := (v_q ->> 'total')::int;

  -- Delivery: distance is geocoded in the browser, so only accept it within the admin cap
  if v_delivery = 'delivery' then
    select value into v_cfg from public.site_settings where id = 'warehouse_delivery_settings';
    v_dmax := coalesce(public._num(v_cfg ->> 'max_fee', 499), 499)::int;
    v_dfee := greatest(0, least(coalesce(p_delivery_fee, 0), v_dmax));
  end if;

  v_total := v_quote_total + v_dfee;
  if p_expected_total is not null and abs(p_expected_total - v_total) > 2 then
    raise exception 'PRICE_CHANGED: the total is now ₹% (you saw ₹%). Review and try again.', v_total, p_expected_total;
  end if;

  -- Wallet: take what the wallet can cover; the rest goes to the chosen method
  if (p_use_wallet or v_method_id = 'wallet') and v_total > 0 then
    perform public.ensure_wallet(v_uid);
    select available into v_bal from public.wallets where user_id = v_uid for update;
    v_wallet := least(coalesce(v_bal, 0), v_total);
  end if;
  v_remaining := v_total - v_wallet;

  if v_method_id = 'wallet' and v_remaining > 0 then
    raise exception 'Wallet balance is too low for this booking.';
  end if;

  -- Payment method
  if v_remaining = 0 then
    v_type := 'wallet';
    v_stored_method := case when v_wallet > 0 then 'wallet' else coalesce(nullif(v_method_id, ''), 'wallet') end;
    v_pay_status := 'paid';
  else
    if v_method_id in ('', 'wallet') then
      raise exception 'Choose a payment method.';
    end if;
    select * into v_pm from public.payment_methods where id = v_method_id and is_enabled = true;
    if not found then
      raise exception 'That payment method is not available.';
    end if;
    v_type := v_pm.method_type;
    v_stored_method := case when v_wallet > 0 then 'wallet+' || v_method_id else v_method_id end;

    if v_type in ('qr', 'upi', 'bank') then
      v_ref := upper(regexp_replace(coalesce(p_payment_ref, ''), '\s', '', 'g'));
      if char_length(v_ref) >= 4 and v_ref ~ '^[A-Z0-9]{4,40}$' then
        v_pay_status := 'submitted';
      else
        v_ref := null;
        v_pay_status := 'pending';
      end if;
    elsif v_type = 'razorpay' then
      -- Pending-first: the booking exists and holds the dates; only the
      -- server (webhook / verify) can flip it to 'paid'.
      v_pay_status := 'pending';
      v_requires_payment := true;
      select value into v_cfg from public.site_settings where id = 'booking_hold';
      v_hold_min := least(60, greatest(3, coalesce(public._num(v_cfg ->> 'minutes', 10), 10)::int));
      v_hold_until := now() + make_interval(mins => v_hold_min);
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
      total_amount, wallet_amount, paid_amount,
      delivery_fee, delivery_distance_km, warehouse_note,
      status,
      payment_status, payment_method, payment_ref, payment_submitted_at,
      hold_expires_at,
      delivery_type, delivery_address,
      insurance_opted, insurance_amount, protection_plan
    ) values (
      v_id, v_listing.id, v_uid, v_listing.user_id,
      p_start_date, p_end_date, (v_q ->> 'days')::int,
      (v_q ->> 'price_day')::int, (v_q ->> 'subtotal')::int, (v_q ->> 'platform_fee')::int, (v_q ->> 'deposit')::int,
      (v_q ->> 'discount_total')::int, (v_q ->> 'duration_discount')::int, (v_q ->> 'coupon_discount')::int,
      nullif(v_q ->> 'coupon_id', '')::uuid, v_q ->> 'coupon_code',
      v_total, v_wallet, v_remaining,
      v_dfee, case when v_delivery = 'delivery' then coalesce(p_delivery_distance_km, 0) else 0 end,
      case when v_delivery = 'delivery' then left(p_warehouse_note, 400) end,
      'pending',
      v_pay_status, v_stored_method, v_ref,
      case when v_pay_status = 'submitted' then now() end,
      v_hold_until,
      v_delivery, v_address,
      (v_q ->> 'protection_cost')::int > 0, (v_q ->> 'protection_cost')::int, v_q ->> 'protection_plan'
    );
  exception when unique_violation then
    raise exception 'That payment reference was already used on another booking.';
  end;

  -- Spend the wallet portion in the same transaction
  if v_wallet > 0 then
    perform public.spend_wallet(v_wallet, v_id);
  end if;
  if v_pay_status = 'paid' then
    update public.bookings
    set payment_confirmed_at = now(), updated_at = now()
    where id = v_id;
  end if;

  update public.listings
  set total_bookings = coalesce(total_bookings, 0) + 1,
      updated_at = now()
  where id = v_listing.id;

  return v_q || jsonb_build_object(
    'booking_id', v_id,
    'status', 'pending',
    'payment_status', v_pay_status,
    'payment_method', v_stored_method,
    'delivery_fee', v_dfee,
    'total', v_total,
    'wallet_amount', v_wallet,
    'amount_due', v_remaining,
    'requires_payment', v_requires_payment,
    'hold_expires_at', v_hold_until,
    'hold_seconds', case when v_hold_until is null then null
                         else greatest(0, floor(extract(epoch from (v_hold_until - now()))))::int end
  );
end;
$$;

-- ── 5. Server-only payment confirmation ──────────────────────
create or replace function public.confirm_booking_payment_system(
  p_booking_id uuid,
  p_razorpay_payment_id text,
  p_amount_paise bigint default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings%rowtype;
  v_units int;
  v_taken int;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found.';
  end if;

  if b.payment_status = 'paid' then
    return 'already_paid';
  end if;

  if p_amount_paise is not null
     and p_amount_paise <> round(coalesce(b.paid_amount, 0) * 100)::bigint then
    raise exception 'Amount mismatch: paid % paise, expected % paise.',
      p_amount_paise, round(coalesce(b.paid_amount, 0) * 100)::bigint;
  end if;

  perform set_config('localden.booking_write', '1', true);

  -- Hold lapsed (or booking already auto-cancelled): only accept if the dates are still free.
  if b.status = 'cancelled'
     or (b.hold_expires_at is not null and b.hold_expires_at < now()) then

    select greatest(coalesce(nullif(stock_total, 0), nullif(stock_qty, 0), 1), 1)
      into v_units from public.listings where id = b.listing_id;

    select count(*) into v_taken
    from public.bookings o
    where o.listing_id = b.listing_id
      and o.id <> b.id
      and public._booking_blocks_dates(o.status, o.payment_status, o.hold_expires_at)
      and o.start_date < b.end_date
      and o.end_date > b.start_date;

    if b.status = 'cancelled' or v_taken >= v_units then
      -- Money arrived but we cannot honour the booking: flag for an admin refund.
      update public.bookings
      set razorpay_payment_id = coalesce(razorpay_payment_id, p_razorpay_payment_id),
          payment_note = 'PAID AFTER HOLD EXPIRED - REFUND NEEDED (' || coalesce(p_razorpay_payment_id, '?') || ')',
          updated_at = now()
      where id = b.id;
      perform public.push_notification(
        b.renter_id, b.id, 'payment_refund_pending',
        'Payment received after the hold expired',
        'Your dates were released before the payment arrived. We will refund ₹' || coalesce(b.paid_amount, 0) || ' to your original payment method.',
        '/dashboard?tab=bookings'
      );
      return 'needs_refund';
    end if;
  end if;

  update public.bookings
  set payment_status = 'paid',
      razorpay_payment_id = coalesce(p_razorpay_payment_id, razorpay_payment_id),
      payment_confirmed_at = now(),
      hold_expires_at = null,
      updated_at = now()
  where id = b.id;

  perform public.push_notification(
    b.renter_id, b.id, 'payment_confirmed',
    'Payment confirmed',
    'Your payment of ₹' || coalesce(b.paid_amount, b.total_amount) || ' was received.',
    '/dashboard?tab=bookings'
  );

  return 'paid';
end;
$$;

-- ── 6. Permissions ───────────────────────────────────────────
revoke all on function public.create_booking(uuid, date, date, text, text, text, text, text, text, integer, boolean, integer, numeric, text) from public, anon;
grant execute on function public.create_booking(uuid, date, date, text, text, text, text, text, text, integer, boolean, integer, numeric, text) to authenticated;

revoke all on function public.release_expired_holds() from public, anon;
grant execute on function public.release_expired_holds() to authenticated, service_role;

revoke all on function public.cancel_pending_hold(uuid) from public, anon;
grant execute on function public.cancel_pending_hold(uuid) to authenticated;

-- Server-only: the browser must never be able to mark a payment as paid
revoke all on function public.confirm_booking_payment_system(uuid, text, bigint) from public, anon, authenticated;
grant execute on function public.confirm_booking_payment_system(uuid, text, bigint) to service_role;

grant execute on function public.get_listing_booked_ranges(uuid) to anon, authenticated;
grant execute on function public.listing_busy_dates(uuid, date, date) to anon, authenticated;
grant select on public.listing_busy_ranges to anon, authenticated;

notify pgrst, 'reload schema';

