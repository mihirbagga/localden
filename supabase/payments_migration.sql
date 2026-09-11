-- ═══════════════════════════════════════════════════════════
-- लोकल Den — Payment methods
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

create table if not exists public.payment_methods (
  id            text primary key,
  name          text not null,
  method_type   text not null
                check (method_type in ('razorpay', 'qr', 'upi', 'bank', 'cash')),
  is_enabled    boolean not null default false,
  sort_order    integer not null default 0,
  config        jsonb not null default '{}'::jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

insert into public.payment_methods (id, name, method_type, is_enabled, sort_order, config)
values
  (
    'razorpay',
    'Razorpay',
    'razorpay',
    false,
    1,
    '{"key_id":"","instructions":"Pay securely via cards, UPI, netbanking."}'::jsonb
  ),
  (
    'qr',
    'QR / UPI scan',
    'qr',
    true,
    2,
    '{"qr_image_url":"","upi_id":"","instructions":"Scan the QR, pay the total, then tap I have paid."}'::jsonb
  ),
  (
    'upi',
    'UPI ID',
    'upi',
    false,
    3,
    '{"upi_id":"","instructions":"Send the total to this UPI ID, then tap I have paid."}'::jsonb
  ),
  (
    'bank',
    'Bank transfer',
    'bank',
    false,
    4,
    '{"account_name":"","account_number":"","ifsc":"","bank_name":"","instructions":"Transfer the total and tap I have paid."}'::jsonb
  ),
  (
    'cash',
    'Cash on pickup',
    'cash',
    false,
    5,
    '{"instructions":"Pay cash when you collect the gear."}'::jsonb
  )
on conflict (id) do nothing;

alter table public.bookings
  add column if not exists payment_method text;

alter table public.bookings
  add column if not exists payment_ref text;

alter table public.payment_methods enable row level security;

drop policy if exists "Enabled payment methods readable" on public.payment_methods;
drop policy if exists "Admins manage payment methods" on public.payment_methods;
drop policy if exists "Admins update payment methods" on public.payment_methods;

create policy "Enabled payment methods readable"
  on public.payment_methods for select
  using (is_enabled = true or public.current_user_is_admin());

create policy "Admins update payment methods"
  on public.payment_methods for update
  using (public.current_user_is_admin());

create policy "Admins manage payment methods"
  on public.payment_methods for insert
  with check (public.current_user_is_admin());
