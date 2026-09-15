-- ═══════════════════════════════════════════════════════════
-- लोकल Den — Manual KYC (Aadhaar/PAN + selfie)
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- Also create private bucket "kyc-docs" if this insert is blocked:
--   Storage → New bucket → kyc-docs → Private
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

alter table public.profiles
  add column if not exists kyc_note text;

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

create table if not exists public.kyc_submissions (
  id             uuid default uuid_generate_v4() primary key,
  user_id        uuid references public.profiles(id) on delete cascade not null,
  full_name      text not null,
  phone          text,
  id_type        text not null check (id_type in ('aadhaar', 'pan')),
  id_last4       text not null check (char_length(id_last4) = 4),
  id_doc_path    text not null,
  selfie_path    text not null,
  status         text not null default 'submitted'
                 check (status in ('submitted', 'verified', 'rejected')),
  reviewer_id    uuid references public.profiles(id) on delete set null,
  reviewer_note  text,
  submitted_at   timestamptz not null default now(),
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists kyc_submissions_user_idx
  on public.kyc_submissions (user_id, submitted_at desc);

create index if not exists kyc_submissions_status_idx
  on public.kyc_submissions (status, submitted_at desc);

create unique index if not exists kyc_submissions_one_open_idx
  on public.kyc_submissions (user_id)
  where status = 'submitted';

-- ── Privileged profile fields (users cannot self-verify) ────
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
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged on public.profiles;
create trigger profiles_protect_privileged
  before update on public.profiles
  for each row execute procedure public.protect_profile_privileged();

create or replace function public.on_kyc_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_rec record;
begin
  perform set_config('localden.kyc_write', '1', true);

  if tg_op = 'INSERT' then
    update public.profiles
    set
      kyc_status = 'submitted',
      aadhaar_last4 = new.id_last4,
      full_name = coalesce(nullif(trim(new.full_name), ''), full_name),
      phone = coalesce(nullif(trim(new.phone), ''), phone),
      kyc_note = null,
      updated_at = now()
    where id = new.user_id;

    perform public.push_notification(
      new.user_id, null, 'kyc_submitted',
      'KYC submitted',
      'Admin usually reviews within an hour.',
      '/kyc'
    );

    for admin_rec in
      select id from public.profiles
      where is_admin = true or admin_role in ('admin', 'super_admin')
    loop
      perform public.push_notification(
        admin_rec.id, null, 'kyc_queue_' || new.id::text,
        'KYC to review',
        coalesce(new.full_name, 'A user') || ' sent ' || new.id_type || ' docs.',
        '/admin'
      );
    end loop;
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    update public.profiles
    set
      kyc_status = new.status,
      aadhaar_last4 = new.id_last4,
      kyc_note = new.reviewer_note,
      updated_at = now()
    where id = new.user_id;

    if new.status = 'verified' then
      perform public.push_notification(
        new.user_id, null, 'kyc_verified_' || new.id::text,
        'KYC verified',
        'You can rent and list gear now.',
        '/browse'
      );
    elsif new.status = 'rejected' then
      perform public.push_notification(
        new.user_id, null, 'kyc_rejected_' || new.id::text,
        'KYC needs a fix',
        coalesce(new.reviewer_note, 'Admin rejected your docs. Resubmit from KYC.'),
        '/kyc'
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists kyc_submissions_change on public.kyc_submissions;
create trigger kyc_submissions_change
  after insert or update of status
  on public.kyc_submissions
  for each row execute procedure public.on_kyc_row_change();

create or replace function public.review_kyc(
  p_submission_id uuid,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'Not allowed';
  end if;
  if p_status not in ('verified', 'rejected') then
    raise exception 'Status must be verified or rejected';
  end if;
  if p_status = 'rejected' and coalesce(trim(p_note), '') = '' then
    raise exception 'Add a note when rejecting';
  end if;

  update public.kyc_submissions
  set
    status = p_status,
    reviewer_id = auth.uid(),
    reviewer_note = nullif(trim(p_note), ''),
    reviewed_at = now(),
    updated_at = now()
  where id = p_submission_id
    and status = 'submitted';

  if not found then
    raise exception 'Submission is not waiting for review';
  end if;
end;
$$;

-- ── RLS ──────────────────────────────────────────────────────
alter table public.kyc_submissions enable row level security;

drop policy if exists "Users view own kyc" on public.kyc_submissions;
drop policy if exists "Users insert own kyc" on public.kyc_submissions;
drop policy if exists "Admins view all kyc" on public.kyc_submissions;
drop policy if exists "Admins update kyc" on public.kyc_submissions;

create policy "Users view own kyc"
  on public.kyc_submissions for select
  using (auth.uid() = user_id or public.current_user_is_admin());

create policy "Users insert own kyc"
  on public.kyc_submissions for insert
  with check (auth.uid() = user_id);

create policy "Admins view all kyc"
  on public.kyc_submissions for select
  using (public.current_user_is_admin());

create policy "Admins update kyc"
  on public.kyc_submissions for update
  using (public.current_user_is_admin());

grant execute on function public.review_kyc(uuid, text, text) to authenticated;

-- ── Private storage ──────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kyc-docs',
  'kyc-docs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own kyc docs" on storage.objects;
drop policy if exists "Users update own kyc docs" on storage.objects;
drop policy if exists "Users and admins read kyc docs" on storage.objects;

create policy "Users upload own kyc docs"
  on storage.objects for insert
  with check (
    bucket_id = 'kyc-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users update own kyc docs"
  on storage.objects for update
  using (
    bucket_id = 'kyc-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users and admins read kyc docs"
  on storage.objects for select
  using (
    bucket_id = 'kyc-docs'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.current_user_is_admin()
    )
  );
