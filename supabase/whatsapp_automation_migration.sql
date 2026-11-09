-- ════════════════════════════════════════════════════════════
--  LocalDen — Automatic WhatsApp messages (server-side)
--
--  Database events queue rows in whatsapp_outbox; the
--  whatsapp-dispatch edge function writes the message text and
--  POSTs it to the WHATSAPP_WEBHOOK_URL secret (Make/Zapier/n8n/
--  WATI/Evolution API). Nothing here can block a booking write:
--  every enqueue swallows its own errors.
--
--  Events
--    Booking:  booking_placed (renter), booking_requested (host),
--              admin_new_order (admin), booking_confirmed,
--              booking_active, booking_completed, booking_cancelled
--    Money:    payment_verified, deposit_settled, payout_update
--    Trust:    review_received, kyc_update, admin_kyc_submitted,
--              welcome, listing_live
--    Daily:    pickup_reminder, return_reminder, return_overdue,
--              review_nudge
--
--  Run AFTER pending_first_booking_migration.sql and
--  review_feedback_migration.sql. Safe to re-run.
--  Setup steps for the dispatcher are at the bottom of this file.
-- ════════════════════════════════════════════════════════════

-- ── 1. Outbox ────────────────────────────────────────────────
create table if not exists public.whatsapp_outbox (
  id               uuid primary key default gen_random_uuid(),
  event            text not null,
  recipient_role   text not null check (recipient_role in ('renter', 'lister', 'user', 'admin')),
  recipient_id     uuid references public.profiles(id) on delete cascade,
  booking_id       uuid references public.bookings(id) on delete cascade,
  ref_id           uuid,
  dedupe_key       text not null unique,
  status           text not null default 'queued'
                   check (status in ('queued', 'sending', 'sent', 'failed', 'skipped')),
  attempts         integer not null default 0,
  next_attempt_at  timestamptz not null default now(),
  phone            text,
  message          text,
  last_error       text,
  created_at       timestamptz not null default now(),
  sent_at          timestamptz
);

create index if not exists whatsapp_outbox_due_idx on public.whatsapp_outbox (status, next_attempt_at);
create index if not exists whatsapp_outbox_created_idx on public.whatsapp_outbox (created_at desc);

alter table public.whatsapp_outbox enable row level security;

drop policy if exists "Admins read whatsapp outbox" on public.whatsapp_outbox;
create policy "Admins read whatsapp outbox"
  on public.whatsapp_outbox for select
  using (public.current_user_is_admin());

drop policy if exists "Admins update whatsapp outbox" on public.whatsapp_outbox;
create policy "Admins update whatsapp outbox"
  on public.whatsapp_outbox for update
  using (public.current_user_is_admin());

-- ── 2. Settings gate ─────────────────────────────────────────
-- site_settings['whatsapp_notifications'] = { enabled, events: { <event>: bool }, ...legacy toggles }
create or replace function public.wa_event_enabled(p_event text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with s as (
    select coalesce((select value from public.site_settings where id = 'whatsapp_notifications'), '{}'::jsonb) as v
  )
  select coalesce((v ->> 'enabled')::boolean, true)
     and coalesce(
       (v -> 'events' ->> p_event)::boolean,
       -- toggles saved by the older admin screen
       (v ->> (case p_event
         when 'admin_new_order'     then 'notify_on_new_order'
         when 'payment_verified'    then 'notify_on_payment_verified'
         when 'admin_kyc_submitted' then 'notify_on_kyc_submit'
         when 'welcome'             then 'notify_on_user_signup'
         when 'listing_live'        then 'notify_on_listing_live'
       end))::boolean,
       p_event <> 'admin_kyc_submitted'
     )
  from s;
$$;

-- ── 3. Enqueue (never raises) ────────────────────────────────
create or replace function public.wa_enqueue(
  p_event     text,
  p_role      text,
  p_recipient uuid,
  p_booking   uuid default null,
  p_ref       uuid default null,
  p_dedupe    text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_role <> 'admin' and p_recipient is null then
    return;
  end if;
  if not public.wa_event_enabled(p_event) then
    return;
  end if;

  insert into public.whatsapp_outbox (event, recipient_role, recipient_id, booking_id, ref_id, dedupe_key)
  values (
    p_event, p_role, p_recipient, p_booking, p_ref,
    coalesce(p_dedupe, concat_ws(':', p_event, coalesce(p_booking::text, p_ref::text), coalesce(p_recipient::text, p_role)))
  )
  on conflict (dedupe_key) do nothing;
exception when others then
  raise warning 'wa_enqueue(%) skipped: %', p_event, sqlerrm;
end;
$$;

-- ── 4. Booking events ────────────────────────────────────────
-- Online-payment bookings are inserted as a short "hold" before payment.
-- They only count as a real request once paid/submitted or without a hold.
create or replace function public.wa_booking_is_live(p_hold timestamptz, p_payment text)
returns boolean
language sql
immutable
as $$
  select p_hold is null or coalesce(p_payment, '') in ('paid', 'submitted');
$$;

create or replace function public.wa_booking_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_was_live boolean := false;
  v_is_live  boolean := public.wa_booking_is_live(new.hold_expires_at, new.payment_status);
begin
  if tg_op = 'UPDATE' then
    v_was_live := public.wa_booking_is_live(old.hold_expires_at, old.payment_status);
  end if;

  -- New request (dedupe keys make the INSERT/UPDATE paths idempotent)
  if v_is_live and not v_was_live and new.status in ('pending', 'confirmed') then
    perform public.wa_enqueue('booking_placed',    'renter', new.renter_id, new.id);
    perform public.wa_enqueue('booking_requested', 'lister', new.lister_id, new.id);
    perform public.wa_enqueue('admin_new_order',   'admin',  null,          new.id);
  end if;

  if tg_op = 'INSERT' then
    return null;
  end if;

  if new.status is distinct from old.status then
    if new.status in ('confirmed', 'active', 'completed', 'cancelled') then
      perform public.wa_enqueue('booking_' || new.status, 'renter', new.renter_id, new.id);
      perform public.wa_enqueue('booking_' || new.status, 'lister', new.lister_id, new.id);
    end if;
  end if;

  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    perform public.wa_enqueue('payment_verified', 'renter', new.renter_id, new.id);
  end if;

  if new.deposit_status in ('refunded', 'partially_refunded', 'forfeited')
     and new.deposit_status is distinct from old.deposit_status then
    perform public.wa_enqueue('deposit_settled', 'renter', new.renter_id, new.id);
  end if;

  return null;
end;
$$;

drop trigger if exists wa_booking_events on public.bookings;
create trigger wa_booking_events
  after insert or update on public.bookings
  for each row execute procedure public.wa_booking_events();

-- ── 5. Payouts, reviews, profiles, listings ──────────────────
create or replace function public.wa_payout_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('completed', 'rejected') and new.status is distinct from old.status then
    perform public.wa_enqueue('payout_update', 'user', new.user_id, null, new.id,
      concat_ws(':', 'payout_update', new.id::text, new.status));
  end if;
  return null;
end;
$$;

do $$
begin
  drop trigger if exists wa_payout_events on public.payout_requests;
  create trigger wa_payout_events
    after update on public.payout_requests
    for each row execute procedure public.wa_payout_events();
exception when undefined_table then
  raise notice 'payout_requests missing — payout messages skipped';
end $$;

create or replace function public.wa_review_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.wa_enqueue('review_received', 'user', new.reviewee_id, new.booking_id, new.id);
  return null;
end;
$$;

drop trigger if exists wa_review_events on public.reviews;
create trigger wa_review_events
  after insert on public.reviews
  for each row execute procedure public.wa_review_events();

create or replace function public.wa_profile_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Welcome once, as soon as we have a number to send it to
  if coalesce(new.phone, '') <> '' and (tg_op = 'INSERT' or coalesce(old.phone, '') = '') then
    perform public.wa_enqueue('welcome', 'user', new.id, null, new.id, 'welcome:' || new.id::text);
  end if;

  if tg_op = 'UPDATE' and new.kyc_status is distinct from old.kyc_status then
    if new.kyc_status in ('verified', 'rejected') then
      perform public.wa_enqueue('kyc_update', 'user', new.id, null, new.id,
        concat_ws(':', 'kyc_update', new.id::text, new.kyc_status, to_char(now(), 'YYYYMMDDHH24MI')));
    elsif new.kyc_status = 'submitted' then
      perform public.wa_enqueue('admin_kyc_submitted', 'admin', null, null, new.id,
        concat_ws(':', 'admin_kyc_submitted', new.id::text, to_char(now(), 'YYYYMMDD')));
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists wa_profile_events on public.profiles;
create trigger wa_profile_events
  after insert or update of phone, kyc_status on public.profiles
  for each row execute procedure public.wa_profile_events();

create or replace function public.wa_listing_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.is_published, true)
     and (tg_op = 'INSERT' or coalesce(old.is_published, true) = false) then
    perform public.wa_enqueue('listing_live', 'user', new.user_id, null, new.id, 'listing_live:' || new.id::text);
  end if;
  return null;
end;
$$;

drop trigger if exists wa_listing_events on public.listings;
create trigger wa_listing_events
  after insert or update of is_published on public.listings
  for each row execute procedure public.wa_listing_events();

-- ── 6. Daily reminders (09:00 IST) ───────────────────────────
create or replace function public.wa_enqueue_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_before integer;
  v_after integer;
  r record;
begin
  select count(*) into v_before from public.whatsapp_outbox;

  -- Pickup / delivery tomorrow → both sides
  for r in
    select id, renter_id, lister_id from public.bookings
    where status = 'confirmed' and start_date = v_today + 1
  loop
    perform public.wa_enqueue('pickup_reminder', 'renter', r.renter_id, r.id);
    perform public.wa_enqueue('pickup_reminder', 'lister', r.lister_id, r.id);
  end loop;

  -- Return due tomorrow → renter
  for r in
    select id, renter_id from public.bookings
    where status = 'active' and end_date = v_today + 1
  loop
    perform public.wa_enqueue('return_reminder', 'renter', r.renter_id, r.id);
  end loop;

  -- Overdue (first 3 days only, once a day) → both sides
  for r in
    select id, renter_id, lister_id from public.bookings
    where status = 'active' and end_date between v_today - 3 and v_today - 1
  loop
    perform public.wa_enqueue('return_overdue', 'renter', r.renter_id, r.id, null,
      concat_ws(':', 'return_overdue', r.id::text, 'renter', v_today::text));
    perform public.wa_enqueue('return_overdue', 'lister', r.lister_id, r.id, null,
      concat_ws(':', 'return_overdue', r.id::text, 'lister', v_today::text));
  end loop;

  -- Review nudge ~2 days after completion, only to whoever hasn't reviewed
  for r in
    select b.id, b.renter_id, b.lister_id from public.bookings b
    where b.status = 'completed'
      and b.updated_at between now() - interval '3 days' and now() - interval '2 days'
  loop
    if not exists (select 1 from public.reviews where booking_id = r.id and reviewer_id = r.renter_id) then
      perform public.wa_enqueue('review_nudge', 'renter', r.renter_id, r.id);
    end if;
    if not exists (select 1 from public.reviews where booking_id = r.id and reviewer_id = r.lister_id) then
      perform public.wa_enqueue('review_nudge', 'lister', r.lister_id, r.id);
    end if;
  end loop;

  select count(*) into v_after from public.whatsapp_outbox;
  return v_after - v_before;
end;
$$;

-- ── 7. Dispatcher plumbing ───────────────────────────────────
-- Atomically claim due rows so overlapping runs never double-send.
create or replace function public.wa_claim_batch(p_limit integer default 25)
returns setof public.whatsapp_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Recover rows stuck in 'sending' (function crashed mid-run)
  update public.whatsapp_outbox
  set status = 'queued'
  where status = 'sending' and next_attempt_at < now() - interval '5 minutes';

  return query
  with claimed as (
    update public.whatsapp_outbox o
    set status = 'sending',
        attempts = o.attempts + 1,
        next_attempt_at = now()
    where o.id in (
      select id from public.whatsapp_outbox
      where status = 'queued' and next_attempt_at <= now()
      order by created_at
      limit p_limit
      for update skip locked
    )
    returning o.*
  )
  select * from claimed;
end;
$$;

-- Called every minute by pg_cron: pokes the edge function only when work is due.
create or replace function public.wa_kick_dispatch()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url    text;
  v_secret text;
begin
  if not exists (select 1 from public.whatsapp_outbox where status = 'queued' and next_attempt_at <= now()) then
    return;
  end if;
  select decrypted_secret into v_url    from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'wa_dispatch_secret';
  if v_url is null or v_secret is null then
    raise notice 'wa_kick_dispatch: add vault secrets project_url and wa_dispatch_secret';
    return;
  end if;
  perform net.http_post(
    url     := rtrim(v_url, '/') || '/functions/v1/whatsapp-dispatch',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-dispatch-secret', v_secret),
    body    := '{"action":"process"}'::jsonb
  );
end;
$$;

-- Internal only: triggers and cron call these, users never should
revoke execute on function public.wa_enqueue(text, text, uuid, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.wa_enqueue_reminders() from public, anon, authenticated;
revoke execute on function public.wa_claim_batch(integer) from public, anon, authenticated;
revoke execute on function public.wa_kick_dispatch() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  create extension if not exists pg_net;
exception when others then
  raise notice 'Enable pg_cron and pg_net in Dashboard → Database → Extensions: %', sqlerrm;
end $$;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname in ('wa-dispatch', 'wa-reminders');
  perform cron.schedule('wa-dispatch',  '* * * * *',  'select public.wa_kick_dispatch()');
  perform cron.schedule('wa-reminders', '30 3 * * *', 'select public.wa_enqueue_reminders()');
exception when others then
  raise notice 'cron jobs not scheduled (enable pg_cron, then re-run this file): %', sqlerrm;
end $$;

-- ════════════════════════════════════════════════════════════
--  Dispatcher setup (one time)
--  1. Deploy:   supabase functions deploy whatsapp-dispatch --no-verify-jwt
--  2. Secrets:  supabase secrets set WHATSAPP_WEBHOOK_URL=<your webhook>
--                                    WA_DISPATCH_SECRET=<long random string>
--                                    SITE_URL=https://localden.online
--  3. Vault (SQL editor):
--       select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--       select vault.create_secret('<same WA_DISPATCH_SECRET>', 'wa_dispatch_secret');
--  4. Admin → WhatsApp → Save once, to clear the old public webhook_url.
-- ════════════════════════════════════════════════════════════
