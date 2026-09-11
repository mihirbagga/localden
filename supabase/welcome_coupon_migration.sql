-- ═══════════════════════════════════════════════════════════
-- Welcome coupon on signup: WELCOME{NAME}50 · 50% · 1 use
-- Run in: Supabase → SQL Editor
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════

alter table public.coupons
  add column if not exists owner_id uuid references public.profiles(id) on delete cascade;

create index if not exists coupons_owner_idx on public.coupons (owner_id);

create or replace function public.welcome_coupon_code(p_name text, p_user_id uuid)
returns text
language plpgsql
as $$
declare
  slug text;
  base text;
  code text;
  suffix text;
begin
  slug := upper(regexp_replace(split_part(trim(coalesce(p_name, '')), ' ', 1), '[^A-Za-z0-9]', '', 'g'));
  if coalesce(slug, '') = '' then
    slug := 'USER';
  end if;
  if char_length(slug) > 12 then
    slug := left(slug, 12);
  end if;
  base := 'WELCOME' || slug || '50';
  code := base;
  suffix := upper(left(replace(p_user_id::text, '-', ''), 4));
  if exists (select 1 from public.coupons c where upper(c.code) = upper(code)) then
    code := base || suffix;
  end if;
  return code;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
  ccode text;
begin
  uname := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    ''
  );

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, uname);

  begin
    if to_regclass('public.coupons') is null then
      return new;
    end if;
    ccode := public.welcome_coupon_code(uname, new.id);
    insert into public.coupons (
      code,
      description,
      discount_type,
      discount_value,
      usage_limit,
      is_active,
      owner_id
    ) values (
      ccode,
      'Welcome 50% off for ' || coalesce(nullif(uname, ''), 'new member'),
      'percent',
      50,
      1,
      true,
      new.id
    );
  exception when others then
    raise warning 'welcome coupon skipped: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop policy if exists "Active coupons readable" on public.coupons;
create policy "Active coupons readable"
  on public.coupons for select
  using (
    (
      is_active = true
      and (owner_id is null or owner_id = auth.uid())
    )
    or public.current_user_is_admin()
  );
