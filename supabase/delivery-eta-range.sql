-- Add delivery ETA range options for restaurants
-- Run in Supabase SQL Editor

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS delivery_eta_range TEXT DEFAULT '15-30';

UPDATE restaurants
SET delivery_eta_range = CASE
  WHEN eta_minutes IS NULL OR eta_minutes <= 30 THEN '15-30'
  WHEN eta_minutes <= 60 THEN '30-60'
  ELSE '60+'
END
WHERE delivery_eta_range IS NULL;

ALTER TABLE restaurants
  ALTER COLUMN delivery_eta_range SET DEFAULT '15-30';

ALTER TABLE restaurants
  ALTER COLUMN delivery_eta_range SET NOT NULL;

ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_eta_minutes_range;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_delivery_eta_range_check'
  ) THEN
    ALTER TABLE restaurants
      ADD CONSTRAINT restaurants_delivery_eta_range_check
      CHECK (delivery_eta_range IN ('15-30', '30-60', '60+'));
  END IF;
END $$;
