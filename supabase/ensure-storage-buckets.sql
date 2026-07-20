-- Create all storage buckets MagdaYa needs (run once in Supabase SQL Editor)
-- Fixes: "Bucket not found" when uploading payment receipts

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('menu-images', 'menu-images', true),
  ('restaurant-images', 'restaurant-images', true),
  ('payment-qr', 'payment-qr', true),
  ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Drop old policies if re-running (safe)
DROP POLICY IF EXISTS "Public read menu images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public read payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload payment receipts" ON storage.objects;

CREATE POLICY "Public read menu images"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('menu-images', 'restaurant-images', 'payment-qr', 'payment-receipts'));

CREATE POLICY "Authenticated upload menu images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('menu-images', 'restaurant-images', 'payment-qr', 'payment-receipts'));

CREATE POLICY "Authenticated update own uploads"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('menu-images', 'restaurant-images', 'payment-qr', 'payment-receipts'));

CREATE POLICY "Authenticated delete uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('menu-images', 'restaurant-images', 'payment-qr', 'payment-receipts'));
