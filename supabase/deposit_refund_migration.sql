-- ==============================================================================
-- Deposit Refund, Booking Status & RLS Migration
-- Run in Supabase Dashboard -> SQL Editor -> New Query (Ensure NO text is partially selected)
-- ==============================================================================

-- 1. Deposit columns
alter table public.bookings
  add column if not exists deposit_status text default 'held',
  add column if not exists deposit_refunded_amount integer default 0,
  add column if not exists deposit_deduction_amount integer default 0,
  add column if not exists deposit_deduction_reason text,
  add column if not exists deposit_refunded_at timestamptz;

-- 2. RLS Policies for lenders and renters
alter table public.bookings enable row level security;

drop policy if exists "Parties can update booking" on public.bookings;
create policy "Parties can update booking"
  on public.bookings for update
  using (auth.uid() = renter_id or auth.uid() = lister_id)
  with check (auth.uid() = renter_id or auth.uid() = lister_id);

drop policy if exists "Users can view own bookings" on public.bookings;
create policy "Users can view own bookings"
  on public.bookings for select
  using (auth.uid() = renter_id or auth.uid() = lister_id);

-- 3. Update guard_booking_update trigger
create or replace function public.guard_booking_update()
returns trigger
language plpgsql
set search_path = public
as $fn$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_ok boolean := false;
  v_free text[] := array[
    'status', 'updated_at', 'renter_note', 'lister_note',
    'deposit_status', 'deposit_refunded_amount', 'deposit_deduction_amount',
    'deposit_deduction_reason', 'deposit_refunded_at',
    'renter_signature', 'renter_signed_at', 'lister_signature', 'lister_signed_at', 'agreement_url'
  ];
  v_cash boolean := (old.payment_method = 'cash');
begin
  if current_setting('localden.booking_write', true) = '1' then
    return new;
  end if;
  if v_uid is null or public.current_user_is_admin() then
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
    raise exception 'Price, dates and payment details of a booking cannot be edited.' using errcode = '42501';
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
      raise exception 'Cannot move from % to % (as %).', old.status, new.status, v_role using errcode = '42501';
    end if;
    if new.status = 'active' and old.payment_status is distinct from 'paid' and not v_cash then
      raise exception 'Payment is not verified yet. An admin must verify it first.' using errcode = '42501';
    end if;
    if new.status = 'completed' and old.payment_status is distinct from 'paid' then
      raise exception 'Mark payment as received before completing booking.' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$fn$;

drop trigger if exists bookings_guard_update on public.bookings;
create trigger bookings_guard_update
  before update on public.bookings
  for each row execute procedure public.guard_booking_update();

-- 4. RPC: update_booking_status
create or replace function public.update_booking_status(
  p_booking_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := auth.uid();
  v_b record;
  v_lister boolean;
  v_renter boolean;
  v_admin boolean;
  v_cash boolean;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'Authentication required');
  end if;

  select * into v_b from public.bookings where id = p_booking_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Booking not found');
  end if;

  v_admin := coalesce((select (raw_user_meta_data->>'is_admin')::boolean from auth.users where id = v_uid), false) or public.current_user_is_admin();
  v_lister := (v_b.lister_id = v_uid);
  v_renter := (v_b.renter_id = v_uid);
  v_cash := (v_b.payment_method = 'cash');

  if not (v_lister or v_renter or v_admin) then
    return jsonb_build_object('success', false, 'error', 'Not authorized');
  end if;

  if not v_admin then
    if v_lister then
      if v_b.status = 'pending' and p_status not in ('confirmed', 'cancelled') then
        return jsonb_build_object('success', false, 'error', 'Pending booking can only be confirmed or cancelled');
      end if;
      if v_b.status = 'confirmed' and p_status not in ('active', 'cancelled') then
        return jsonb_build_object('success', false, 'error', 'Confirmed booking can only be marked active or cancelled');
      end if;
      if v_b.status = 'active' and p_status not in ('completed', 'disputed', 'cancelled') then
        return jsonb_build_object('success', false, 'error', 'Active booking can only be completed or disputed');
      end if;
    elsif v_renter then
      if p_status not in ('cancelled', 'disputed') then
        return jsonb_build_object('success', false, 'error', 'Renters can only cancel or dispute');
      end if;
    end if;

    if p_status = 'active' and v_b.payment_status is distinct from 'paid' and not v_cash then
      return jsonb_build_object('success', false, 'error', 'Payment not verified yet by admin');
    end if;
    if p_status = 'completed' and v_b.payment_status is distinct from 'paid' then
      return jsonb_build_object('success', false, 'error', 'Mark payment received before completing');
    end if;
  end if;

  perform set_config('localden.booking_write', '1', true);
  update public.bookings
  set status = p_status,
      updated_at = now()
  where id = p_booking_id;

  return jsonb_build_object('success', true, 'booking_id', p_booking_id, 'status', p_status);
end;
$fn$;

grant execute on function public.update_booking_status(uuid, text) to anon, authenticated;

-- 5. RPC: process_deposit_refund
create or replace function public.process_deposit_refund(
  p_booking_id uuid,
  p_refund_amount integer,
  p_deduction_amount integer default 0,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_b record;
  v_uid uuid := auth.uid();
  v_lister boolean;
  v_admin boolean;
  v_status text;
  v_dep integer;
begin
  perform set_config('localden.booking_write', '1', true);

  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'Authentication required');
  end if;

  select * into v_b from public.bookings where id = p_booking_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Booking not found');
  end if;

  v_admin := coalesce((select (raw_user_meta_data->>'is_admin')::boolean from auth.users where id = v_uid), false) or public.current_user_is_admin();
  v_lister := (v_b.lister_id = v_uid);

  if not (v_lister or v_admin) then
    return jsonb_build_object('success', false, 'error', 'Only host or admin can process deposit refunds');
  end if;

  v_dep := coalesce(v_b.deposit, 0);

  if p_refund_amount < 0 or p_deduction_amount < 0 then
    return jsonb_build_object('success', false, 'error', 'Amounts cannot be negative');
  end if;

  if (p_refund_amount + p_deduction_amount) > v_dep then
    return jsonb_build_object('success', false, 'error', 'Exceeds deposit held');
  end if;

  if p_deduction_amount = 0 and p_refund_amount > 0 then
    v_status := 'refunded';
  elsif p_deduction_amount > 0 and p_refund_amount > 0 then
    v_status := 'partially_refunded';
  elsif p_deduction_amount > 0 and p_refund_amount = 0 then
    v_status := 'forfeited';
  else
    v_status := 'refunded';
  end if;

  update public.bookings
  set deposit_status = v_status,
      deposit_refunded_amount = p_refund_amount,
      deposit_deduction_amount = p_deduction_amount,
      deposit_deduction_reason = p_reason,
      deposit_refunded_at = now(),
      updated_at = now()
  where id = p_booking_id;

  return jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'deposit_status', v_status,
    'refund_amount', p_refund_amount,
    'deduction_amount', p_deduction_amount,
    'reason', p_reason
  );
end;
$fn$;

grant execute on function public.process_deposit_refund(uuid, integer, integer, text) to anon, authenticated;
