-- ═══════════════════════════════════════════════════════════
-- लोकल Den — Fix Supabase Storage CORS Policies
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- Enable CORS for listing-photos and kyc-docs storage buckets
UPDATE storage.buckets
SET cors_rules = jsonb_build_array(
  jsonb_build_object(
    'AllowedOrigins', jsonb_build_array('*'),
    'AllowedMethods', jsonb_build_array('GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'),
    'AllowedHeaders', jsonb_build_array('*'),
    'MaxAgeSeconds', 3600
  )
)
WHERE id IN ('listing-photos', 'kyc-docs');

-- Create listing-photos bucket if not already created
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, cors_rules)
VALUES (
  'listing-photos',
  'listing-photos',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'],
  jsonb_build_array(
    jsonb_build_object(
      'AllowedOrigins', jsonb_build_array('*'),
      'AllowedMethods', jsonb_build_array('GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'),
      'AllowedHeaders', jsonb_build_array('*'),
      'MaxAgeSeconds', 3600
    )
  )
)
ON CONFLICT (id) DO UPDATE
SET
  public = excluded.public,
  cors_rules = excluded.cors_rules;

-- Ensure RLS Policies for listing-photos bucket allow uploads and reads
DROP POLICY IF EXISTS "Public listing photos read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload listing photos" ON storage.objects;
DROP POLICY IF EXISTS "Users update own listing photos" ON storage.objects;

CREATE POLICY "Public listing photos read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-photos');

CREATE POLICY "Authenticated users upload listing photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users update own listing photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'listing-photos'
    AND auth.role() = 'authenticated'
  );
