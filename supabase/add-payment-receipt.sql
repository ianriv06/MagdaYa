-- Payment receipt upload support
-- Run in Supabase SQL Editor

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for receipts (ignore if they already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Public read payment receipts'
  ) THEN
    CREATE POLICY "Public read payment receipts"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'payment-receipts');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Authenticated upload payment receipts'
  ) THEN
    CREATE POLICY "Authenticated upload payment receipts"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'payment-receipts');
  END IF;
END $$;
