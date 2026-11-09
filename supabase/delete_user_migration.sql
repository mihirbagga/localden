-- ═══════════════════════════════════════════════════════════
-- लोकल Den — Complete User Deletion & Purge Migration
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- 1. Enable deletion RLS policy on profiles for owners and admins
alter table public.profiles enable row level security;

drop policy if exists "Users and admins can delete profile" on public.profiles;
create policy "Users and admins can delete profile"
  on public.profiles for delete
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or p.admin_role in ('admin', 'super_admin'))
    )
  );

-- 2. Complete Account Deletion Function (removes from auth.users and public.profiles)
create or replace function public.delete_user_account(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caller uuid := auth.uid();
  v_is_admin boolean := false;
  v_active_count integer := 0;
begin
  if v_caller is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  -- Check admin permission (checks both is_admin boolean and admin_role)
  select (
    coalesce(is_admin, false)
    or coalesce(admin_role in ('super_admin', 'admin', 'regional_admin'), false)
  ) into v_is_admin
  from public.profiles
  where id = v_caller;

  -- Only the account owner or an admin can delete the account
  if v_caller != p_user_id and not coalesce(v_is_admin, false) then
    return jsonb_build_object('success', false, 'error', 'Permission denied. Only admins or account owner can delete.');
  end if;

  -- Safety check: Prevent deleting user with active rentals
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'bookings' and column_name = 'renter_id') then
    select count(*) into v_active_count
    from public.bookings
    where (renter_id = p_user_id or lister_id = p_user_id)
      and status in ('pending', 'confirmed', 'active');

    if v_active_count > 0 then
      return jsonb_build_object(
        'success', false,
        'error', 'Cannot delete user with ' || v_active_count || ' active booking(s) in progress.'
      );
    end if;
  end if;

  -- 1. Safely nullify operational references only if table and column exist
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'hubs' and column_name = 'manager_id') then
    execute 'update public.hubs set manager_id = null where manager_id = $1' using p_user_id;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ops_staff' and column_name = 'profile_id') then
    execute 'delete from public.ops_staff where profile_id = $1' using p_user_id;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'bookings' and column_name = 'payment_confirmed_by') then
    execute 'update public.bookings set payment_confirmed_by = null where payment_confirmed_by = $1' using p_user_id;
  end if;

  -- 2. Clean up child records only if tables exist
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'listings' and column_name = 'user_id') then
    execute 'delete from public.listings where user_id = $1' using p_user_id;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'kyc_submissions' and column_name = 'user_id') then
    execute 'delete from public.kyc_submissions where user_id = $1' using p_user_id;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'wallet_entries' and column_name = 'user_id') then
    execute 'delete from public.wallet_entries where user_id = $1' using p_user_id;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'wallets' and column_name = 'user_id') then
    execute 'delete from public.wallets where user_id = $1' using p_user_id;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'notifications' and column_name = 'user_id') then
    execute 'delete from public.notifications where user_id = $1' using p_user_id;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'payout_requests' and column_name = 'user_id') then
    execute 'delete from public.payout_requests where user_id = $1' using p_user_id;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'whatsapp_outbox' and column_name = 'recipient_id') then
    execute 'delete from public.whatsapp_outbox where recipient_id = $1' using p_user_id;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reviews' and column_name = 'reviewer_id') then
    execute 'delete from public.reviews where reviewer_id = $1 or reviewee_id = $1' using p_user_id;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'bookings' and column_name = 'renter_id') then
    execute 'delete from public.bookings where renter_id = $1 or lister_id = $1' using p_user_id;
  end if;

  -- 3. Delete from public.profiles
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles') then
    delete from public.profiles where id = p_user_id;
  end if;

  -- 4. Delete from auth.users (permanently removes login credentials & user from Supabase Auth)
  delete from auth.users where id = p_user_id;

  return jsonb_build_object('success', true);
exception when others then
  return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;

grant execute on function public.delete_user_account(uuid) to authenticated, service_role;
