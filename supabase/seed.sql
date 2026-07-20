-- Seed demo data (run AFTER creating users via the app, OR create users first)
-- Recommended flow:
-- 1. Sign up via the app as each role
-- 2. Then run the restaurant/menu seed below with your restaurant owner UUID

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('menu-images', 'menu-images', true),
  ('restaurant-images', 'restaurant-images', true),
  ('payment-qr', 'payment-qr', true),
  ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
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

-- Optional: demo restaurants (replace OWNER_UUID with a restaurant user's profile id)
-- INSERT INTO restaurants (owner_id, name, description, cuisine, address, lat, lng, image_url, cover_url, rating, delivery_fee, eta_minutes)
-- VALUES
-- (
--   'OWNER_UUID',
--   'Green Bowl Kitchen',
--   'Fresh bowls, salads, and comfort food made daily.',
--   'Healthy · Bowls',
--   '123 Market St, New York, NY',
--   40.7209, -74.0007,
--   'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
--   'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&q=80',
--   4.8, 2.99, 25
-- );
