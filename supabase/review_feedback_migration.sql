-- ════════════════════════════════════════════════════════════
--  Review feedback migration
--  1. Structured feedback on reviews: highlight tags + an
--     improvement suggestion for the person being reviewed.
--  2. Keep listings.rating / total_reviews and profiles.rating in
--     sync with visible reviews (they were never recalculated).
--  Safe to re-run.
-- ════════════════════════════════════════════════════════════

-- ── 1. Feedback columns ─────────────────────────────────────
alter table public.reviews add column if not exists highlights  text[] not null default '{}';
alter table public.reviews add column if not exists improvement text;

alter table public.reviews drop constraint if exists reviews_improvement_len;
alter table public.reviews add constraint reviews_improvement_len
  check (improvement is null or char_length(improvement) <= 600);

alter table public.reviews drop constraint if exists reviews_highlights_len;
alter table public.reviews add constraint reviews_highlights_len
  check (coalesce(array_length(highlights, 1), 0) <= 8);

-- Backfill review_type for older rows so listing ratings only count renter reviews
update public.reviews r
set review_type = case when r.reviewer_id = b.renter_id then 'renter_to_lister' else 'lister_to_renter' end
from public.bookings b
where b.id = r.booking_id
  and r.review_type is null;

-- ── 2. Rating rollups ───────────────────────────────────────
create or replace function public.refresh_review_rollups(p_listing_id uuid, p_reviewee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- guard_listing_write() lets this through; users still cannot write ratings directly
  perform set_config('localden.booking_write', '1', true);

  if p_listing_id is not null then
    update public.listings l
    set rating = coalesce(s.avg_rating, 0),
        total_reviews = coalesce(s.cnt, 0)
    from (
      select round(avg(rating)::numeric, 1) as avg_rating, count(*)::int as cnt
      from public.reviews
      where listing_id = p_listing_id
        and coalesce(is_hidden, false) = false
        and coalesce(review_type, 'renter_to_lister') = 'renter_to_lister'
    ) s
    where l.id = p_listing_id;
  end if;

  if p_reviewee_id is not null then
    update public.profiles p
    set rating = coalesce((
      select round(avg(rating)::numeric, 1)
      from public.reviews
      where reviewee_id = p_reviewee_id
        and coalesce(is_hidden, false) = false
    ), 0)
    where p.id = p_reviewee_id;
  end if;

  perform set_config('localden.booking_write', '', true);
end;
$$;

create or replace function public.reviews_stamp_type()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    -- Stamp the direction so the listing rating only counts renter reviews
    if tg_op = 'INSERT' and new.review_type is null then
      select case when new.reviewer_id = b.renter_id then 'renter_to_lister' else 'lister_to_renter' end
      into new.review_type
      from public.bookings b
      where b.id = new.booking_id;
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.reviews_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_review_rollups(old.listing_id, old.reviewee_id);
  else
    perform public.refresh_review_rollups(new.listing_id, new.reviewee_id);
    if tg_op = 'UPDATE' and (old.listing_id, old.reviewee_id) is distinct from (new.listing_id, new.reviewee_id) then
      perform public.refresh_review_rollups(old.listing_id, old.reviewee_id);
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists reviews_before_write on public.reviews;
create trigger reviews_before_write
  before insert on public.reviews
  for each row execute procedure public.reviews_stamp_type();

drop trigger if exists reviews_after_write on public.reviews;
create trigger reviews_after_write
  after insert or update or delete on public.reviews
  for each row execute procedure public.reviews_after_change();

-- One-time recalculation for existing data
do $$
declare r record;
begin
  for r in select distinct listing_id, reviewee_id from public.reviews loop
    perform public.refresh_review_rollups(r.listing_id, r.reviewee_id);
  end loop;
end $$;
