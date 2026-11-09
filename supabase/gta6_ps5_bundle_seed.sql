-- ═══════════════════════════════════════════════════════════════
-- लोकल Den — GTA 6 PS5 Bundle Seed (₹800/day)
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

do $$
declare
  v_user_id uuid;
  v_listing_id uuid := '11111111-2222-3333-4444-555555555555'::uuid;
  v_hub_id uuid;
begin
  -- 1. Pick admin or first available user
  select id into v_user_id from public.profiles where is_admin = true limit 1;
  if v_user_id is null then
    select id into v_user_id from public.profiles order by created_at asc limit 1;
  end if;

  if v_user_id is null then
    raise notice 'No profile found in public.profiles. Please sign up or create a profile first.';
    return;
  end if;

  -- 2. Pick default Bengaluru hub if regional ops hubs exist
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'hubs') then
    select id into v_hub_id from public.hubs where city ilike '%bengaluru%' or city ilike '%bangalore%' limit 1;
  end if;

  -- 3. Insert or update the GTA 6 PS5 listing
  insert into public.listings (
    id,
    user_id,
    title,
    description,
    category,
    subcategory,
    condition,
    brand,
    model,
    price_day,
    price_weekend,
    price_week,
    deposit_amount,
    location,
    photos,
    emoji,
    stock_qty,
    stock_total,
    is_available,
    is_verified,
    is_featured,
    is_published,
    fulfillment_type,
    city,
    created_at,
    updated_at
  ) values (
    v_listing_id,
    v_user_id,
    'Sony PlayStation 5 + GTA 6 Pre-Loaded Edition + 2 Controllers',
    'Vice City ready! Sony PlayStation 5 Disc Edition bundled with Grand Theft Auto VI (GTA 6). Includes 2 original DualSense wireless controllers with haptic feedback, Ultra High Speed HDMI 2.1 cable, power cord, USB-C charging cable, and premium carry case. Pre-loaded and tested for 4K 60FPS ray-traced action.

[GAMES: Grand Theft Auto VI (Digital) | Grand Theft Auto V (Disc) | Marvel''s Spider-Man 2 (Disc) | FIFA (Digital)]',
    'gaming',
    'Console',
    'like_new',
    'Sony',
    'PS5 Disc Edition (1TB)',
    800,
    1899,
    4499,
    5000,
    'Koramangala, Bengaluru',
    array['/hero/ps5.png', '/banners/free_ps5_contest.png'],
    '🎮',
    2,
    2,
    true,
    true,
    true,
    true,
    'warehouse',
    'Bengaluru',
    now(),
    now()
  )
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    price_day = 800,
    price_weekend = 1899,
    price_week = 4499,
    deposit_amount = 5000,
    is_available = true,
    is_published = true,
    is_featured = true,
    is_verified = true,
    stock_qty = excluded.stock_qty,
    updated_at = now();

  -- 4. Link hub_id if column exists
  if v_hub_id is not null and exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'listings' and column_name = 'hub_id'
  ) then
    update public.listings set hub_id = v_hub_id where id = v_listing_id;
  end if;

  -- 5. Update site_settings for listing_games
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'site_settings') then
    insert into public.site_settings (id, value, updated_at)
    values (
      'listing_games',
      jsonb_build_object(
        v_listing_id::text,
        jsonb_build_array(
          jsonb_build_object('title', 'Grand Theft Auto VI', 'format', 'Digital', 'genre', 'Open World Action'),
          jsonb_build_object('title', 'Grand Theft Auto V', 'format', 'Disc', 'genre', 'Open World'),
          jsonb_build_object('title', 'Marvel''s Spider-Man 2', 'format', 'Disc', 'genre', 'Action'),
          jsonb_build_object('title', 'FIFA', 'format', 'Digital', 'genre', 'Sports')
        )
      ),
      now()
    )
    on conflict (id) do update set
      value = coalesce(public.site_settings.value, '{}'::jsonb) || jsonb_build_object(
        v_listing_id::text,
        jsonb_build_array(
          jsonb_build_object('title', 'Grand Theft Auto VI', 'format', 'Digital', 'genre', 'Open World Action'),
          jsonb_build_object('title', 'Grand Theft Auto V', 'format', 'Disc', 'genre', 'Open World'),
          jsonb_build_object('title', 'Marvel''s Spider-Man 2', 'format', 'Disc', 'genre', 'Action'),
          jsonb_build_object('title', 'FIFA', 'format', 'Digital', 'genre', 'Sports')
        )
      ),
      updated_at = now();
  end if;

  raise notice 'GTA 6 PS5 Bundle for ₹800/day created successfully with ID %', v_listing_id;
end $$;

