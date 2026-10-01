-- ═══════════════════════════════════════════════════════════
-- Welcome coupon on signup: WELCOME{NAME}50 · 50% · 1 use
-- Run in: Supabase → SQL Editor  (re-run safe)
-- Also backfills users who signed up with no coupon.
-- ═══════════════════════════════════════════════════════════

alter table public.coupons
  add column if not exists owner_id uuid references public.profiles(id) on delete cascade;

create index if not exists coupons_owner_idx on public.coupons (owner_id);

-- Auth trigger runs as supabase_auth_admin. It can write profiles,
-- but not coupons unless granted. That is why inserts were silent.
grant usage on schema public to supabase_auth_admin;
grant select, insert on public.coupons to supabase_auth_admin;
grant select, insert, update on public.profiles to supabase_auth_admin;

create or replace function public.welcome_coupon_code(p_name text, p_user_id uuid)
returns text
language plpgsql
as $$
declare
  slug text;
  base text;
  vCode text;
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
  vCode := base;
  suffix := upper(left(replace(p_user_id::text, '-', ''), 4));
  if exists (select 1 from public.coupons c where upper(c.code) = upper(vCode)) then
    vCode := base || suffix;
  end if;
  return vCode;
end;
$$;

create or replace function public.issue_welcome_coupon_for(p_user_id uuid, p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  ccode text;
  uname text;
  v_setting jsonb;
  v_enabled boolean := true;
  v_percent numeric := 50;
  v_max numeric := 500;
  v_min numeric := 0;
  slug text;
  base text;
  suffix text;
  existing_id uuid;
  existing_used integer := 0;
begin
  if p_user_id is null then
    return null;
  end if;

  -- 1. Read admin settings from site_settings (id = 'signup_coupon')
  select value into v_setting
  from public.site_settings
  where id = 'signup_coupon'
  limit 1;

  if v_setting is not null then
    if (v_setting->>'enabled') is not null then
      v_enabled := (v_setting->>'enabled')::boolean;
    end if;
    if (v_setting->>'discount_percent') is not null then
      v_percent := (v_setting->>'discount_percent')::numeric;
    end if;
    if (v_setting->>'max_discount') is not null then
      v_max := (v_setting->>'max_discount')::numeric;
    end if;
    if (v_setting->>'min_subtotal') is not null then
      v_min := (v_setting->>'min_subtotal')::numeric;
    end if;
  end if;

  uname := coalesce(p_name, '');
  slug := upper(regexp_replace(split_part(trim(coalesce(uname, '')), ' ', 1), '[^A-Za-z0-9]', '', 'g'));
  if coalesce(slug, '') = '' then
    slug := 'USER';
  end if;
  if char_length(slug) > 12 then
    slug := left(slug, 12);
  end if;

  -- Check if user already has a welcome coupon
  select c.id, c.code, coalesce(c.used_count, 0)
  into existing_id, ccode, existing_used
  from public.coupons c
  where c.owner_id = p_user_id
    and upper(c.code) like 'WELCOME%'
  order by c.created_at desc
  limit 1;

  if existing_id is not null then
    if existing_used = 0 then
      if not v_enabled then
        update public.coupons
        set is_active = false
        where id = existing_id;
        return null;
      end if;

      base := 'WELCOME' || slug || round(v_percent)::text;
      update public.coupons
      set
        discount_value = round(v_percent),
        code = regexp_replace(code, '\d+$', round(v_percent)::text),
        description = 'Welcome ' || round(v_percent)::text || '% off for ' || coalesce(nullif(uname, ''), 'member'),
        max_discount = nullif(v_max, 0),
        min_subtotal = coalesce(v_min, 0),
        is_active = true
      where id = existing_id;
    end if;
    return ccode;
  end if;

  -- If disabled by admin, do not issue any coupon
  if not v_enabled or v_percent <= 0 then
    return null;
  end if;

  base := 'WELCOME' || slug || round(v_percent)::text;
  ccode := base;
  suffix := upper(left(replace(p_user_id::text, '-', ''), 4));
  if exists (select 1 from public.coupons c where upper(c.code) = upper(ccode)) then
    ccode := base || suffix;
  end if;

  insert into public.coupons (
    code,
    description,
    discount_type,
    discount_value,
    max_discount,
    min_subtotal,
    usage_limit,
    used_count,
    is_active,
    owner_id
  ) values (
    ccode,
    'Welcome ' || round(v_percent)::text || '% off for ' || coalesce(nullif(uname, ''), 'new member'),
    'percent',
    round(v_percent),
    nullif(v_max, 0),
    coalesce(v_min, 0),
    1,
    0,
    true,
    p_user_id
  );

  return ccode;
end;
$$;

create or replace function public.issue_welcome_coupon(p_full_name text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  uname text;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  select p.full_name into uname from public.profiles p where p.id = uid;
  return public.issue_welcome_coupon_for(uid, coalesce(nullif(p_full_name, ''), uname, ''));
end;
$$;

revoke all on function public.issue_welcome_coupon_for(uuid, text) from public;
grant execute on function public.issue_welcome_coupon_for(uuid, text)
  to postgres, supabase_auth_admin, service_role;
grant execute on function public.issue_welcome_coupon(text) to authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  uname := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    ''
  );

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, uname)
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name);

  perform public.issue_welcome_coupon_for(new.id, uname);
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

-- Existing accounts that never got a welcome coupon
do $$
declare
  r record;
begin
  for r in select id, full_name from public.profiles
  loop
    perform public.issue_welcome_coupon_for(r.id, coalesce(r.full_name, ''));
  end loop;
end;
$$;
