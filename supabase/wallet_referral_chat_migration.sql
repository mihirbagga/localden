-- ═══════════════════════════════════════════════════════════
-- लोकल Den — Wallet, referrals, booking chat
-- Run in: Supabase Dashboard → SQL Editor → New Query
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

create table if not exists public.notifications (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  booking_id  uuid,
  kind        text not null,
  title       text not null,
  body        text,
  link        text,
  is_read     boolean not null default false,
  created_at  timestamptz default now()
);

create unique index if not exists notifications_dedupe_idx
  on public.notifications (user_id, booking_id, kind);

create or replace function public.push_notification(
  p_user_id uuid,
  p_booking_id uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_link text
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

alter table public.profiles
  add column if not exists referral_code text;

create unique index if not exists profiles_referral_code_idx
  on public.profiles (referral_code)
  where referral_code is not null;

create table if not exists public.wallets (
  user_id     uuid references public.profiles(id) on delete cascade primary key,
  available   integer not null default 0 check (available >= 0),
  pending     integer not null default 0 check (pending >= 0),
  updated_at  timestamptz not null default now()
);

create table if not exists public.wallet_entries (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  amount        integer not null,
  kind          text not null,
  booking_id    uuid references public.bookings(id) on delete set null,
  referral_id   uuid,
  note          text,
  created_at    timestamptz not null default now()
);

create unique index if not exists wallet_entries_once_idx
  on public.wallet_entries (user_id, booking_id, kind)
  where booking_id is not null;

create index if not exists wallet_entries_user_idx
  on public.wallet_entries (user_id, created_at desc);

create table if not exists public.referrals (
  id            uuid default uuid_generate_v4() primary key,
  referrer_id   uuid references public.profiles(id) on delete cascade not null,
  referee_id    uuid references public.profiles(id) on delete cascade not null unique,
  code          text not null,
  status        text not null default 'pending'
                check (status in ('pending', 'credited')),
  booking_id    uuid references public.bookings(id) on delete set null,
  created_at    timestamptz not null default now(),
  credited_at   timestamptz,
  check (referrer_id <> referee_id)
);

create table if not exists public.booking_messages (
  id            uuid default uuid_generate_v4() primary key,
  booking_id    uuid references public.bookings(id) on delete cascade not null,
  sender_id     uuid references public.profiles(id) on delete cascade not null,
  body          text not null check (char_length(trim(body)) between 1 and 1000),
  created_at    timestamptz not null default now()
);

create index if not exists booking_messages_booking_idx
  on public.booking_messages (booking_id, created_at);

-- ── Helpers ──────────────────────────────────────────────────
create or replace function public.make_referral_code(p_name text, p_id uuid)
returns text
language plpgsql
as $$
declare
  slug text;
  suffix text;
  code text;
  n int := 0;
begin
  slug := upper(regexp_replace(split_part(trim(coalesce(p_name, '')), ' ', 1), '[^A-Za-z0-9]', '', 'g'));
  if coalesce(slug, '') = '' then
    slug := 'DEN';
  end if;
  slug := left(slug, 8);
  suffix := upper(left(replace(p_id::text, '-', ''), 4));
  code := 'DEN' || slug || suffix;
  while exists (select 1 from public.profiles p where p.referral_code = code and p.id <> p_id) loop
    n := n + 1;
    code := 'DEN' || slug || suffix || n::text;
  end loop;
  return code;
end;
$$;

create or replace function public.ensure_wallet(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.wallets (user_id) values (p_user_id)
  on conflict (user_id) do nothing;
end;
$$;

create or replace function public.ensure_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_name text;
  v_code text;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  perform public.ensure_wallet(uid);
  select full_name, referral_code into v_name, v_code
  from public.profiles where id = uid;
  if v_code is not null then
    return v_code;
  end if;
  v_code := public.make_referral_code(v_name, uid);
  perform set_config('localden.kyc_write', '1', true);
  update public.profiles set referral_code = v_code, updated_at = now() where id = uid;
  return v_code;
end;
$$;

create or replace function public.post_wallet(
  p_user_id uuid,
  p_amount integer,
  p_kind text,
  p_booking_id uuid default null,
  p_referral_id uuid default null,
  p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if p_user_id is null or p_amount = 0 then
    return false;
  end if;
  perform public.ensure_wallet(p_user_id);
  begin
    insert into public.wallet_entries (user_id, amount, kind, booking_id, referral_id, note)
    values (p_user_id, p_amount, p_kind, p_booking_id, p_referral_id, p_note)
    returning id into new_id;
  exception when unique_violation then
    return false;
  end;
  update public.wallets
  set available = available + p_amount, updated_at = now()
  where user_id = p_user_id;
  return true;
end;
$$;

create or replace function public.apply_referral(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_referrer uuid;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  if v_code = '' then
    return false;
  end if;
  select id into v_referrer
  from public.profiles
  where referral_code = v_code;
  if v_referrer is null or v_referrer = uid then
    return false;
  end if;
  if exists (select 1 from public.referrals r where r.referee_id = uid) then
    return true;
  end if;
  insert into public.referrals (referrer_id, referee_id, code)
  values (v_referrer, uid, v_code);
  perform public.push_notification(
    v_referrer, null, 'referral_joined_' || uid::text,
    'Referral signed up',
    'You get ₹200 in wallet after their first paid booking.',
    '/dashboard?tab=wallet'
  );
  return true;
end;
$$;

create or replace function public.spend_wallet(p_amount integer, p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  bal int;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid amount';
  end if;
  perform public.ensure_wallet(uid);
  select available into bal from public.wallets where user_id = uid for update;
  if coalesce(bal, 0) < p_amount then
    raise exception 'Wallet balance is too low';
  end if;
  insert into public.wallet_entries (user_id, amount, kind, booking_id, note)
  values (uid, -p_amount, 'spend', p_booking_id, 'Paid a booking from wallet');
  update public.wallets
  set available = available - p_amount, updated_at = now()
  where user_id = uid;
end;
$$;

create or replace function public.request_wallet_payout(p_amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  bal int;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  if p_amount is null or p_amount < 100 then
    raise exception 'Minimum payout is ₹100';
  end if;
  perform public.ensure_wallet(uid);
  select available into bal from public.wallets where user_id = uid for update;
  if coalesce(bal, 0) < p_amount then
    raise exception 'Wallet balance is too low';
  end if;
  insert into public.wallet_entries (user_id, amount, kind, note)
  values (uid, -p_amount, 'payout_request', 'Payout requested');
  update public.wallets
  set
    available = available - p_amount,
    pending = pending + p_amount,
    updated_at = now()
  where user_id = uid;
end;
$$;

create or replace function public.on_booking_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  keep int;
begin
  if tg_op = 'UPDATE' and old.status is not distinct from new.status
     and old.payment_status is not distinct from new.payment_status then
    return new;
  end if;

  if new.status = 'completed' then
    keep := greatest(coalesce(new.subtotal, 0) - coalesce(new.platform_fee, 0), 0);
    if keep > 0 then
      if public.post_wallet(
        new.lister_id, keep, 'listing_earning', new.id, null,
        'Earning after return'
      ) then
        perform public.push_notification(
          new.lister_id, new.id, 'wallet_earning_' || new.id::text,
          'Earning in wallet',
          '₹' || keep || ' is available after a clean return.',
          '/dashboard?tab=wallet'
        );
      end if;
    end if;
  end if;

  if new.payment_status = 'paid' or new.status in ('confirmed', 'active', 'completed') then
    select * into rec
    from public.referrals
    where referee_id = new.renter_id and status = 'pending'
    limit 1;
    if rec.id is not null then
      if public.post_wallet(rec.referrer_id, 200, 'referral_referrer', new.id, rec.id, 'Referral reward') then
        perform public.push_notification(
          rec.referrer_id, new.id, 'referral_paid_' || rec.id::text,
          '₹200 referral reward',
          'Your friend booked. Credit is in your wallet.',
          '/dashboard?tab=wallet'
        );
      end if;
      if public.post_wallet(rec.referee_id, 100, 'referral_referee', new.id, rec.id, 'Welcome referral bonus') then
        perform public.push_notification(
          rec.referee_id, new.id, 'referral_bonus_' || rec.id::text,
          '₹100 referral bonus',
          'Thanks for booking with a friend code.',
          '/dashboard?tab=wallet'
        );
      end if;
      update public.referrals
      set status = 'credited', booking_id = new.id, credited_at = now()
      where id = rec.id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_wallet on public.bookings;
create trigger bookings_wallet
  after insert or update of status, payment_status
  on public.bookings
  for each row execute procedure public.on_booking_wallet();

create or replace function public.on_booking_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings%rowtype;
  other uuid;
  title text;
begin
  select * into b from public.bookings where id = new.booking_id;
  if b.id is null then
    return new;
  end if;
  other := case when new.sender_id = b.renter_id then b.lister_id else b.renter_id end;
  select coalesce(l.title, 'Booking') into title
  from public.listings l where l.id = b.listing_id;
  perform public.push_notification(
    other, b.id, 'chat_' || new.id::text,
    'New message',
    left(title || ': ' || new.body, 120),
    '/dashboard?tab=' || case when other = b.lister_id then 'incoming' else 'bookings' end
  );
  return new;
end;
$$;

drop trigger if exists booking_messages_notify on public.booking_messages;
create trigger booking_messages_notify
  after insert on public.booking_messages
  for each row execute procedure public.on_booking_message();

-- ── RLS ──────────────────────────────────────────────────────
alter table public.wallets enable row level security;
alter table public.wallet_entries enable row level security;
alter table public.referrals enable row level security;
alter table public.booking_messages enable row level security;

drop policy if exists "Users view own wallet" on public.wallets;
drop policy if exists "Users view own ledger" on public.wallet_entries;
drop policy if exists "Users view own referrals" on public.referrals;
drop policy if exists "Parties view booking chat" on public.booking_messages;
drop policy if exists "Parties send booking chat" on public.booking_messages;

create policy "Users view own wallet"
  on public.wallets for select
  using (auth.uid() = user_id or public.current_user_is_admin());

create policy "Users view own ledger"
  on public.wallet_entries for select
  using (auth.uid() = user_id or public.current_user_is_admin());

create policy "Users view own referrals"
  on public.referrals for select
  using (auth.uid() = referrer_id or auth.uid() = referee_id or public.current_user_is_admin());

create policy "Parties view booking chat"
  on public.booking_messages for select
  using (
    public.current_user_is_admin()
    or exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.renter_id = auth.uid() or b.lister_id = auth.uid())
    )
  );

create policy "Parties send booking chat"
  on public.booking_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.renter_id = auth.uid() or b.lister_id = auth.uid())
    )
  );

grant execute on function public.ensure_referral_code() to authenticated;
grant execute on function public.apply_referral(text) to authenticated;
grant execute on function public.spend_wallet(integer, uuid) to authenticated;
grant execute on function public.request_wallet_payout(integer) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.booking_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- Keep referral codes stable once issued
create or replace function public.protect_profile_privileged()
returns trigger
language plpgsql
as $$
begin
  if current_setting('localden.kyc_write', true) = '1' then
    return new;
  end if;
  if public.current_user_is_admin() then
    return new;
  end if;
  new.kyc_status := old.kyc_status;
  new.aadhaar_last4 := old.aadhaar_last4;
  new.kyc_note := old.kyc_note;
  new.is_admin := old.is_admin;
  new.admin_role := old.admin_role;
  new.is_banned := old.is_banned;
  new.referral_code := old.referral_code;
  return new;
end;
$$;

-- Backfill codes + wallets for existing users
do $$
begin
  perform set_config('localden.kyc_write', '1', true);
  update public.profiles p
  set referral_code = public.make_referral_code(p.full_name, p.id)
  where p.referral_code is null;
end $$;

insert into public.wallets (user_id)
select id from public.profiles
on conflict (user_id) do nothing;
