-- ============================================================
-- LocalDen Date-Wise Availability Migration
-- Fixes items disappearing from gears list when booked for specific dates.
-- ============================================================

-- 1. Restore listings that were wrongly marked unavailable or zero stock
update public.listings
set is_available = true,
    stock_qty = greatest(coalesce(stock_total, 1), coalesce(stock_qty, 1), 1)
where is_published = true;

-- 2. Drop obsolete stock depletion trigger if present
drop trigger if exists bookings_restore_stock on public.bookings;
drop function if exists public.restore_stock_on_booking_end();

-- 3. Update create_booking() to not deplete stock or mark listing unavailable
create or replace function public.create_booking(
  p_listing_id uuid,
  p_start_date date,
  p_end_date date,
  p_payment_method text,
  p_delivery_type text,
  p_delivery_address text default null,
  p_coupon_code text default null,
  p_protection_plan text default 'none',
  p_payment_ref text default null,
  p_razorpay_payment_id text default null,
  p_expected_total int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_listing record;
  v_q jsonb;
  v_id uuid := gen_random_uuid();
  v_method_id text := nullif(trim(coalesce(p_payment_method, '')), '');
  v_method record;
  v_type text := 'manual';
  v_pay_status text := 'pending';
  v_delivery text;
  v_address text;
  v_ref text := nullif(trim(coalesce(p_payment_ref, '')), '');
  v_rzp text := nullif(trim(coalesce(p_razorpay_payment_id, '')), '');
  v_total int;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'You must be signed in to book.';
  end if;

  if p_start_date is null or p_end_date is null or p_end_date <= p_start_date then
    raise exception 'Invalid date range.';
  end if;
  if p_start_date < current_date then
    raise exception 'Start date cannot be in the past.';
  end if;

  v_delivery := lower(trim(coalesce(p_delivery_type, 'pickup')));
  if v_delivery not in ('pickup', 'delivery') then
    v_delivery := 'pickup';
  end if;
  v_address := nullif(trim(coalesce(p_delivery_address, '')), '');

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

  -- Price: always calculated authoritative on the database
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

  -- Payment method resolution
  if v_method_id is null then
    raise exception 'Choose a payment method.';
  end if;

  if v_method_id = 'wallet' then
    v_type := 'wallet';
  else
    select * into v_method from public.payment_methods where id = v_method_id;
    if not found or coalesce(v_method.is_enabled, true) = false then
      raise exception 'That payment method is not available.';
    end if;
    v_type := coalesce(v_method.method_type, 'manual');
  end if;

  if v_type = 'manual' then
    if v_ref is not null and char_length(v_ref) >= 4 then
      v_pay_status := 'submitted';
    else
      v_pay_status := 'pending';
      v_ref := null;
    end if;
  elsif v_type = 'razorpay' then
    if v_rzp is null then
      raise exception 'Razorpay payment id missing.';
    end if;
    v_pay_status := 'paid';
  elsif v_type = 'wallet' then
    v_pay_status := 'pending';
  end if;

  -- Insert booking (triggers assert_booking_slot_open to check date-wise overlap)
  begin
    insert into public.bookings (
      id, listing_id, user_id, lister_id,
      start_date, end_date, total_days,
      price_day, subtotal, platform_fee, deposit_amount,
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

  -- Wallet spend
  if v_type = 'wallet' then
    perform public.spend_wallet(v_total, v_id);
    update public.bookings
    set payment_status = 'paid',
        payment_confirmed_at = now(),
        updated_at = now()
    where id = v_id;
    v_pay_status := 'paid';
  end if;

  -- Counters (Notice: listings remain available date-wise; stock is NOT decremented)
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
