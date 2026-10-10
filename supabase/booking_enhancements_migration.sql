-- ==============================================================================
-- Booking Enhancements Migration:
-- 1. Signatures & Agreement Storage
-- 2. Deposit Refund Flow (Held, Refunded, Partially Refunded, Forfeited)
-- 3. Automatic Notifications & Alerts for Status Transitions
-- ==============================================================================

-- 1. Add columns to public.bookings if they don't already exist
alter table public.bookings
  add column if not exists renter_signature text,
  add column if not exists renter_signed_at timestamptz,
  add column if not exists lister_signature text,
  add column if not exists lister_signed_at timestamptz,
  add column if not exists agreement_url text,
  add column if not exists deposit_status text default 'held',
  add column if not exists deposit_refunded_amount integer default 0,
  add column if not exists deposit_deduction_amount integer default 0,
  add column if not exists deposit_deduction_reason text,
  add column if not exists deposit_refunded_at timestamptz;

-- Set default deposit_status check constraint
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_deposit_status_check'
  ) then
    alter table public.bookings
      add constraint bookings_deposit_status_check
      check (deposit_status in ('held', 'refunded', 'partially_refunded', 'forfeited', 'not_applicable'));
  end if;
end $$;

-- Helpers (idempotent fallbacks)
create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.push_notification(
  p_user_id uuid,
  p_booking_id uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_link text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;
  insert into public.notifications (user_id, booking_id, kind, title, body, link)
  values (p_user_id, p_booking_id, p_kind, p_title, p_body, p_link)
  on conflict do nothing;
end;
$$;

-- 2. RPC to record digital agreement signature
create or replace function public.sign_booking_agreement(
  p_booking_id uuid,
  p_signature text,
  p_agreement_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
  v_uid uuid := auth.uid();
  v_is_renter boolean;
  v_is_lister boolean;
  v_is_admin boolean;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'Authentication required');
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Booking not found');
  end if;

  v_is_admin := public.current_user_is_admin();
  v_is_renter := (v_booking.renter_id = v_uid);
  v_is_lister := (v_booking.lister_id = v_uid);

  if not (v_is_renter or v_is_lister or v_is_admin) then
    return jsonb_build_object('success', false, 'error', 'Not authorized to sign this booking');
  end if;

  if v_is_renter then
    update public.bookings
    set renter_signature = p_signature,
        renter_signed_at = coalesce(renter_signed_at, now()),
        agreement_url = coalesce(p_agreement_url, agreement_url),
        updated_at = now()
    where id = p_booking_id;

    perform public.push_notification(
      v_booking.lister_id,
      p_booking_id,
      'agreement_signed',
      'Agreement E-Signed by Borrower',
      'The borrower has digitally signed the rental agreement.',
      '/dashboard?tab=incoming'
    );
  elsif v_is_lister or v_is_admin then
    update public.bookings
    set lister_signature = p_signature,
        lister_signed_at = coalesce(lister_signed_at, now()),
        agreement_url = coalesce(p_agreement_url, agreement_url),
        updated_at = now()
    where id = p_booking_id;

    perform public.push_notification(
      v_booking.renter_id,
      p_booking_id,
      'agreement_signed',
      'Agreement E-Signed by Host',
      'The host has digitally signed the rental pact.',
      '/dashboard?tab=bookings'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'signed_as', case when v_is_renter then 'renter' else 'lister' end
  );
end;
$$;

grant execute on function public.sign_booking_agreement(uuid, text, text) to authenticated;

-- 3. RPC to process security deposit refund
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
as $$
declare
  v_booking record;
  v_uid uuid := auth.uid();
  v_is_lister boolean;
  v_is_admin boolean;
  v_status text;
  v_total_deposit integer;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'Authentication required');
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Booking not found');
  end if;

  v_is_admin := public.current_user_is_admin();
  v_is_lister := (v_booking.lister_id = v_uid);

  if not (v_is_lister or v_is_admin) then
    return jsonb_build_object('success', false, 'error', 'Only the listing host or platform admin can process deposit refunds');
  end if;

  v_total_deposit := coalesce(v_booking.deposit, 0);

  if p_refund_amount < 0 or p_deduction_amount < 0 then
    return jsonb_build_object('success', false, 'error', 'Amounts cannot be negative');
  end if;

  if (p_refund_amount + p_deduction_amount) > v_total_deposit then
    return jsonb_build_object('success', false, 'error', 'Refund + deduction exceeds total deposit held (' || v_total_deposit || ')');
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

  -- Notify Renter
  perform public.push_notification(
    v_booking.renter_id,
    p_booking_id,
    'deposit_settled',
    case
      when v_status = 'refunded' then 'Security Deposit Refunded (₹' || p_refund_amount || ')'
      when v_status = 'partially_refunded' then 'Deposit Refund Processed (₹' || p_refund_amount || ' refunded, ₹' || p_deduction_amount || ' retained)'
      else 'Deposit Retained (₹' || p_deduction_amount || ')'
    end,
    coalesce(p_reason, 'Deposit settlement has been finalized by the host.'),
    '/dashboard?tab=bookings'
  );

  return jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'deposit_status', v_status,
    'refund_amount', p_refund_amount,
    'deduction_amount', p_deduction_amount,
    'reason', p_reason
  );
end;
$$;

grant execute on function public.process_deposit_refund(uuid, integer, integer, text) to authenticated;

-- 4. Status update notification trigger
create or replace function public.notify_booking_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  if new.status is distinct from old.status then
    select title into v_title from public.listings where id = new.listing_id;
    v_title := coalesce(v_title, 'Gear');

    if new.status = 'confirmed' then
      perform public.push_notification(
        new.renter_id, new.id, 'status_confirmed',
        'Booking Confirmed!',
        v_title || ' is confirmed. Tap to review pickup instructions & agreement.',
        '/dashboard?tab=bookings'
      );
    elsif new.status = 'active' then
      perform public.push_notification(
        new.renter_id, new.id, 'status_active',
        'Gear Handed Over!',
        v_title || ' handover is complete. Enjoy your rental!',
        '/dashboard?tab=bookings'
      );
    elsif new.status = 'completed' then
      perform public.push_notification(
        new.renter_id, new.id, 'status_completed',
        'Gear Returned!',
        v_title || ' return is marked complete. Deposit refund will be reviewed.',
        '/dashboard?tab=bookings'
      );
      perform public.push_notification(
        new.lister_id, new.id, 'status_completed',
        'Gear Returned!',
        v_title || ' returned. Please process deposit refund if inspection looks clean.',
        '/dashboard?tab=incoming'
      );
    elsif new.status = 'cancelled' then
      perform public.push_notification(
        new.renter_id, new.id, 'status_cancelled',
        'Booking Cancelled',
        v_title || ' booking was cancelled.',
        '/dashboard?tab=bookings'
      );
      perform public.push_notification(
        new.lister_id, new.id, 'status_cancelled',
        'Booking Cancelled',
        v_title || ' booking was cancelled.',
        '/dashboard?tab=incoming'
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_booking_status_change on public.bookings;
create trigger trg_booking_status_change
  after update of status
  on public.bookings
  for each row
  execute procedure public.notify_booking_status_change();
