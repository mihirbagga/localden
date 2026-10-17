-- ════════════════════════════════════════════════════════════════════════════
-- लोकल Den — Fix Duplicate Welcome Bonus & Dedicated Payout Requests Table
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Deduplicate any existing duplicate welcome_bonus entries in wallet_entries
do $$
declare
  r record;
  dup_count int;
  deduct_amount int;
begin
  for r in (
    select user_id, count(*) as cnt, min(id) as keep_id
    from public.wallet_entries
    where kind = 'welcome_bonus'
    group by user_id
    having count(*) > 1
  ) loop
    dup_count := r.cnt - 1;
    deduct_amount := dup_count * 100;

    delete from public.wallet_entries
    where user_id = r.user_id
      and kind = 'welcome_bonus'
      and id <> r.keep_id;

    update public.wallets
    set available = greatest(available - deduct_amount, 0),
        updated_at = now()
    where user_id = r.user_id;
  end loop;
end;
$$;

-- 2. Add partial unique index to guarantee welcome_bonus is credited AT MOST ONCE per user
create unique index if not exists wallet_entries_welcome_once_idx
  on public.wallet_entries (user_id, kind)
  where kind = 'welcome_bonus';

-- 3. Idempotent ensure_welcome_wallet_bonus RPC
create or replace function public.ensure_welcome_wallet_bonus()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  bonus_amount integer := 100;
  v_inserted boolean := false;
begin
  if uid is null then
    return false;
  end if;

  perform public.ensure_wallet(uid);

  -- Fast exit if already given
  if exists (
    select 1 from public.wallet_entries
    where user_id = uid and kind = 'welcome_bonus'
  ) then
    return false;
  end if;

  -- Lock wallets row for concurrency protection
  perform 1 from public.wallets where user_id = uid for update;

  begin
    insert into public.wallet_entries (user_id, amount, kind, note)
    values (uid, bonus_amount, 'welcome_bonus', 'Welcome Onboarding Bonus 🎁');
    v_inserted := true;
  exception when unique_violation then
    return false;
  end;

  if v_inserted then
    update public.wallets
    set available = available + bonus_amount, updated_at = now()
    where user_id = uid;

    perform public.push_notification(
      uid, null, 'welcome_wallet_bonus_' || uid::text,
      'Welcome Bonus Added! 🎁',
      '₹' || bonus_amount || ' has been added to your LocalDen wallet!',
      '/dashboard?tab=wallet'
    );
  end if;

  return true;
end;
$$;

grant execute on function public.ensure_welcome_wallet_bonus() to authenticated, service_role;

-- 4. Create dedicated payout_requests table with full RLS
create table if not exists public.payout_requests (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references public.profiles(id) on delete cascade not null,
  amount           integer not null check (amount >= 100),
  payout_method    text not null check (payout_method in ('upi', 'bank')),
  upi_id           text,
  bank_details     jsonb,
  status           text not null default 'pending'
                   check (status in ('pending', 'completed', 'rejected')),
  transaction_ref  text,
  admin_notes      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists payout_requests_user_idx
  on public.payout_requests (user_id, created_at desc);

create index if not exists payout_requests_status_idx
  on public.payout_requests (status, created_at desc);

alter table public.payout_requests enable row level security;

drop policy if exists "Users view own payouts" on public.payout_requests;
create policy "Users view own payouts"
  on public.payout_requests for select
  using (auth.uid() = user_id or public.current_user_is_admin());

drop policy if exists "Users insert own payouts" on public.payout_requests;
create policy "Users insert own payouts"
  on public.payout_requests for insert
  with check (auth.uid() = user_id);

drop policy if exists "Admins update payouts" on public.payout_requests;
create policy "Admins update payouts"
  on public.payout_requests for update
  using (public.current_user_is_admin());

-- 5. Atomic request_user_payout RPC
create or replace function public.request_user_payout(
  p_amount integer,
  p_payout_method text,
  p_upi_id text default null,
  p_bank_details jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  bal int;
  new_req_id uuid;
  res jsonb;
  method_clean text;
  v_note text;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  if p_amount is null or p_amount < 100 then
    raise exception 'Minimum payout is ₹100';
  end if;

  method_clean := lower(trim(coalesce(p_payout_method, 'upi')));
  if method_clean not in ('upi', 'bank') then
    raise exception 'Invalid payout method: must be upi or bank';
  end if;

  if method_clean = 'upi' and (p_upi_id is null or trim(p_upi_id) = '') then
    raise exception 'UPI ID is required for UPI payout';
  end if;

  if method_clean = 'bank' and p_bank_details is null then
    raise exception 'Bank details are required for bank payout';
  end if;

  perform public.ensure_wallet(uid);

  -- Lock user's wallet
  select available into bal from public.wallets where user_id = uid for update;
  if coalesce(bal, 0) < p_amount then
    raise exception 'Insufficient wallet balance (available: ₹%)', coalesce(bal, 0);
  end if;

  -- Create payout request record
  insert into public.payout_requests (
    user_id,
    amount,
    payout_method,
    upi_id,
    bank_details,
    status
  )
  values (
    uid,
    p_amount,
    method_clean,
    trim(p_upi_id),
    p_bank_details,
    'pending'
  )
  returning id into new_req_id;

  -- Prepare ledger note
  if method_clean = 'upi' then
    v_note := 'Payout requested via UPI (' || trim(p_upi_id) || ')';
  else
    v_note := 'Payout requested via Bank Transfer';
  end if;

  -- Deduct from available, add to pending in wallet
  insert into public.wallet_entries (user_id, amount, kind, note)
  values (uid, -p_amount, 'payout_request', v_note);

  update public.wallets
  set
    available = available - p_amount,
    pending = pending + p_amount,
    updated_at = now()
  where user_id = uid;

  -- Return the created request object
  select json_build_object(
    'id', r.id,
    'user_id', r.user_id,
    'amount', r.amount,
    'payout_method', r.payout_method,
    'upi_id', r.upi_id,
    'bank_details', r.bank_details,
    'status', r.status,
    'created_at', r.created_at
  )::jsonb into res
  from public.payout_requests r
  where r.id = new_req_id;

  return res;
end;
$$;

grant execute on function public.request_user_payout(integer, text, text, jsonb) to authenticated, service_role;

-- 6. Atomic admin_process_payout RPC
create or replace function public.admin_process_payout(
  p_request_id uuid,
  p_status text,
  p_transaction_ref text default null,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_adm boolean;
  req record;
  res jsonb;
begin
  is_adm := public.current_user_is_admin();
  if not coalesce(is_adm, false) then
    raise exception 'Unauthorized: Admin access required';
  end if;

  if p_request_id is null then
    raise exception 'Request ID is required';
  end if;

  if p_status not in ('completed', 'rejected') then
    raise exception 'Status must be completed or rejected';
  end if;

  -- Lock payout request
  select * into req
  from public.payout_requests
  where id = p_request_id
  for update;

  if req.id is null then
    raise exception 'Payout request not found';
  end if;

  if req.status <> 'pending' then
    raise exception 'Payout request has already been %', req.status;
  end if;

  if p_status = 'completed' then
    update public.payout_requests
    set
      status = 'completed',
      transaction_ref = coalesce(p_transaction_ref, 'Transferred'),
      admin_notes = p_admin_notes,
      updated_at = now()
    where id = p_request_id;

    -- Clear pending from wallet
    update public.wallets
    set
      pending = greatest(pending - req.amount, 0),
      updated_at = now()
    where user_id = req.user_id;

    perform public.push_notification(
      req.user_id,
      null,
      'payout_completed_' || req.id::text,
      'Payout Completed! 🎉',
      '₹' || req.amount || ' has been transferred to your ' || upper(req.payout_method) || ' account.',
      '/dashboard?tab=wallet'
    );

  elsif p_status = 'rejected' then
    update public.payout_requests
    set
      status = 'rejected',
      admin_notes = coalesce(p_admin_notes, 'Payout rejected by admin'),
      updated_at = now()
    where id = p_request_id;

    -- Refund back to available, clear pending
    insert into public.wallet_entries (user_id, amount, kind, note)
    values (
      req.user_id,
      req.amount,
      'refund',
      'Payout #' || right(req.id::text, 6) || ' rejected: ' || coalesce(p_admin_notes, 'Refunded to wallet')
    );

    update public.wallets
    set
      available = available + req.amount,
      pending = greatest(pending - req.amount, 0),
      updated_at = now()
    where user_id = req.user_id;

    perform public.push_notification(
      req.user_id,
      null,
      'payout_rejected_' || req.id::text,
      'Payout Request Rejected',
      '₹' || req.amount || ' has been refunded back to your wallet. Reason: ' || coalesce(p_admin_notes, 'Admin review'),
      '/dashboard?tab=wallet'
    );
  end if;

  select json_build_object(
    'id', r.id,
    'user_id', r.user_id,
    'amount', r.amount,
    'payout_method', r.payout_method,
    'upi_id', r.upi_id,
    'bank_details', r.bank_details,
    'status', r.status,
    'transaction_ref', r.transaction_ref,
    'admin_notes', r.admin_notes,
    'updated_at', r.updated_at
  )::jsonb into res
  from public.payout_requests r
  where r.id = p_request_id;

  return res;
end;
$$;

grant execute on function public.admin_process_payout(uuid, text, text, text) to authenticated, service_role;

