-- ═══════════════════════════════════════════════════════════
-- लोकल Den — Platform fee setting
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

create table if not exists public.site_settings (
  id          text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz default now()
);

insert into public.site_settings (id, value)
values (
  'platform_fee',
  '{"enabled": true, "fee_type": "percent", "fee_value": 20}'::jsonb
)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "Site settings readable" on public.site_settings;
drop policy if exists "Admins update site settings" on public.site_settings;
drop policy if exists "Admins insert site settings" on public.site_settings;

create policy "Site settings readable"
  on public.site_settings for select
  using (true);

create policy "Admins update site settings"
  on public.site_settings for update
  using (public.current_user_is_admin());

create policy "Admins insert site settings"
  on public.site_settings for insert
  with check (public.current_user_is_admin());
