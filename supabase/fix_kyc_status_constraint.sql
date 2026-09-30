-- ═══════════════════════════════════════════════════════════
-- लोकल Den — Fix profiles_kyc_status_check constraint error
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- 1. Drop old restrictive check constraint
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_kyc_status_check;

-- 2. Add expanded check constraint allowing 'required', 'not_required', 'none', 'unverified'
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_kyc_status_check
  CHECK (kyc_status IN ('pending', 'submitted', 'verified', 'rejected', 'required', 'not_required', 'none', 'unverified'));
