-- Migration: Hub Storage Fee (LocalDen 5% warehouse cut)
-- When a listing is stored at a LocalDen hub (fulfillment_type = 'warehouse' or hub_id is not null),
-- an extra 5% storage & handling cut is retained by LocalDen.

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
  v_storage_fee int := 0;
  v_is_hub boolean := false;
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

  -- Hub storage surcharge: LocalDen keeps 5% extra for warehouse-stored gear
  v_is_hub := coalesce(v_listing.fulfillment_type, 'direct') = 'warehouse' or v_listing.hub_id is not null;
  if v_is_hub then
    v_storage_fee := round(v_net * 5.0 / 100.0)::int;
    v_fee := v_fee + v_storage_fee;
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
    'is_hub_stored', v_is_hub,
    'hub_storage_fee', v_storage_fee,
    'base_platform_fee', v_fee - v_storage_fee,
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

