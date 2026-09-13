-- ═══════════════════════════════════════════════════════════
-- लोकल Den — Check-in / check-out, busy dates, booking alerts
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

-- ── Inspections ──────────────────────────────────────────────
create table if not exists public.booking_inspections (
  id            uuid default uuid_generate_v4() primary key,
  booking_id    uuid references public.bookings(id) on delete cascade not null,
  listing_id    uuid references public.listings(id) on delete cascade not null,
  submitted_by  uuid references public.profiles(id) on delete cascade not null,
  role          text not null check (role in ('renter', 'lister')),
  phase         text not null check (phase in ('checkin', 'checkout')),
  condition     text not null check (condition in ('like_new', 'good', 'fair', 'damaged')),
  notes         text,
  photos        text[] not null default '{}',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (booking_id, submitted_by, phase)
);

create index if not exists booking_inspections_booking_idx
  on public.booking_inspections (booking_id);

-- ── In-app alerts ────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  booking_id  uuid references public.bookings(id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  link        text,
  is_read     boolean not null default false,
  created_at  timestamptz default now()
);

create unique index if not exists notifications_dedupe_idx
  on public.notifications (user_id, booking_id, kind);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

-- ── Busy dates ───────────────────────────────────────────────
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
     and b.status in ('pending', 'confirmed', 'active')
     and b.start_date <= d.d
     and b.end_date > d.d
    group by d.d
  )
  select t.day from taken t where t.cnt >= v_units;
end;
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
    and b.status in ('pending', 'confirmed', 'active')
    and b.start_date < new.end_date
    and b.end_date > new.start_date;

  if v_taken >= v_units then
    raise exception 'Those dates are already booked'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_slot_guard on public.bookings;
create trigger bookings_slot_guard
  before insert or update of start_date, end_date, status, listing_id
  on public.bookings
  for each row execute procedure public.assert_booking_slot_open();

-- ── Push a single alert (deduped) ────────────────────────────
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
  on conflict (user_id, booking_id, kind)
  do nothing;
end;
$$;

create or replace function public.notify_booking_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  select coalesce(title, 'Gear') into v_title
  from public.listings
  where id = new.listing_id;

  if tg_op = 'INSERT' then
    perform public.push_notification(
      new.lister_id, new.id, 'booking_new',
      'New booking request',
      v_title || ' · ' || new.start_date || ' → ' || new.end_date,
      '/dashboard?tab=incoming'
    );
    perform public.push_notification(
      new.renter_id, new.id,
      case when new.status = 'confirmed' then 'status_confirmed' else 'booking_placed' end,
      case when new.status = 'confirmed' then 'Booking confirmed' else 'Booking placed' end,
      case
        when new.status = 'confirmed' then v_title || ' is confirmed. Pickup ' || new.start_date || '.'
        else v_title || ' · awaiting confirm'
      end,
      '/dashboard?tab=bookings'
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'confirmed' then
      perform public.push_notification(
        new.renter_id, new.id, 'status_confirmed',
        'Booking confirmed',
        v_title || ' is confirmed. Pickup ' || new.start_date || '.',
        '/dashboard?tab=bookings'
      );
      perform public.push_notification(
        new.lister_id, new.id, 'status_confirmed',
        'You confirmed a booking',
        v_title || ' · add check-in photos at handover.',
        '/dashboard?tab=incoming'
      );
    elsif new.status = 'active' then
      perform public.push_notification(
        new.renter_id, new.id, 'status_active',
        'Gear handed over',
        'Snap return photos when you give ' || v_title || ' back.',
        '/dashboard?tab=bookings'
      );
      perform public.push_notification(
        new.lister_id, new.id, 'status_active',
        'Handover marked',
        v_title || ' is with the renter until ' || new.end_date || '.',
        '/dashboard?tab=incoming'
      );
    elsif new.status = 'completed' then
      perform public.push_notification(
        new.renter_id, new.id, 'status_completed',
        'Returned',
        v_title || ' marked returned. Deposit review next.',
        '/dashboard?tab=bookings'
      );
      perform public.push_notification(
        new.lister_id, new.id, 'status_completed',
        'Return complete',
        v_title || ' is back. Check check-out photos.',
        '/dashboard?tab=incoming'
      );
    elsif new.status = 'cancelled' then
      perform public.push_notification(
        new.renter_id, new.id, 'status_cancelled',
        'Booking cancelled',
        v_title || ' was cancelled.',
        '/dashboard?tab=bookings'
      );
      perform public.push_notification(
        new.lister_id, new.id, 'status_cancelled',
        'Booking cancelled',
        v_title || ' was cancelled.',
        '/dashboard?tab=incoming'
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_notify on public.bookings;
create trigger bookings_notify
  after insert or update of status
  on public.bookings
  for each row execute procedure public.notify_booking_event();

create or replace function public.notify_inspection_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_title text;
  v_kind text;
  v_other uuid;
  v_link text;
begin
  select * into v_booking from public.bookings where id = new.booking_id;
  if v_booking.id is null then
    return new;
  end if;
  select coalesce(title, 'Gear') into v_title from public.listings where id = v_booking.listing_id;
  v_kind := case when new.phase = 'checkout' then 'inspection_checkout' else 'inspection_checkin' end;
  if new.submitted_by = v_booking.renter_id then
    v_other := v_booking.lister_id;
    v_link := '/dashboard?tab=incoming';
  else
    v_other := v_booking.renter_id;
    v_link := '/dashboard?tab=bookings';
  end if;
  perform public.push_notification(
    v_other, v_booking.id, v_kind || '_' || new.submitted_by::text,
    case when new.phase = 'checkout' then 'Check-out photos in' else 'Check-in photos in' end,
    v_title || ' · condition: ' || new.condition,
    v_link
  );
  return new;
end;
$$;

drop trigger if exists inspections_notify on public.booking_inspections;
create trigger inspections_notify
  after insert
  on public.booking_inspections
  for each row execute procedure public.notify_inspection_event();

-- Call on app open. Safe to run often — rows are deduped.
create or replace function public.issue_due_booking_alerts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  v_title text;
  n int := 0;
begin
  for rec in
    select b.*, l.title
    from public.bookings b
    join public.listings l on l.id = b.listing_id
    where b.status in ('confirmed', 'active')
      and (
        b.start_date = (current_date + 1)
        or (b.status = 'active' and b.end_date = current_date)
        or (b.status = 'active' and b.end_date < current_date)
      )
  loop
    v_title := coalesce(rec.title, 'Gear');

    if rec.start_date = (current_date + 1) then
      perform public.push_notification(
        rec.renter_id, rec.id, 'reminder_start',
        'Pickup tomorrow',
        v_title || ' · ' || rec.start_date || ' → ' || rec.end_date,
        '/dashboard?tab=bookings'
      );
      perform public.push_notification(
        rec.lister_id, rec.id, 'reminder_start',
        'Handover tomorrow',
        v_title || ' · add check-in photos at pickup.',
        '/dashboard?tab=incoming'
      );
      n := n + 1;
    end if;

    if rec.status = 'active' and rec.end_date = current_date then
      perform public.push_notification(
        rec.renter_id, rec.id, 'reminder_return',
        'Return due today',
        v_title || ' is due back today. Add check-out photos.',
        '/dashboard?tab=bookings'
      );
      perform public.push_notification(
        rec.lister_id, rec.id, 'reminder_return',
        'Return due today',
        v_title || ' should come back today.',
        '/dashboard?tab=incoming'
      );
      n := n + 1;
    end if;

    if rec.status = 'active' and rec.end_date < current_date then
      perform public.push_notification(
        rec.renter_id, rec.id, 'reminder_overdue',
        'Return overdue',
        v_title || ' was due ' || rec.end_date || '.',
        '/dashboard?tab=bookings'
      );
      perform public.push_notification(
        rec.lister_id, rec.id, 'reminder_overdue',
        'Return overdue',
        v_title || ' is still out past ' || rec.end_date || '.',
        '/dashboard?tab=incoming'
      );
      n := n + 1;
    end if;
  end loop;

  return n;
end;
$$;

-- ── RLS ──────────────────────────────────────────────────────
alter table public.booking_inspections enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Parties view inspections" on public.booking_inspections;
drop policy if exists "Parties insert inspections" on public.booking_inspections;
drop policy if exists "Parties update own inspections" on public.booking_inspections;
drop policy if exists "Users view own notifications" on public.notifications;
drop policy if exists "Users update own notifications" on public.notifications;

create policy "Parties view inspections"
  on public.booking_inspections for select
  using (
    public.current_user_is_admin()
    or exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.renter_id = auth.uid() or b.lister_id = auth.uid())
    )
  );

create policy "Parties insert inspections"
  on public.booking_inspections for insert
  with check (
    auth.uid() = submitted_by
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.renter_id = auth.uid() or b.lister_id = auth.uid())
    )
  );

create policy "Parties update own inspections"
  on public.booking_inspections for update
  using (auth.uid() = submitted_by);

create policy "Users view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id or public.current_user_is_admin());

create policy "Users update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create or replace view public.listing_busy_ranges
with (security_invoker = false) as
select listing_id, start_date, end_date, status
from public.bookings
where status in ('pending', 'confirmed', 'active');

grant select on public.listing_busy_ranges to anon, authenticated;

grant execute on function public.listing_busy_dates(uuid, date, date) to anon, authenticated;
grant execute on function public.issue_due_booking_alerts() to authenticated;
revoke all on function public.push_notification(uuid, uuid, text, text, text, text) from public, anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
