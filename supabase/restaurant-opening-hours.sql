-- Weekly open/close hours for restaurants (JSON per weekday 0=Sun … 6=Sat).
-- Paste into the Supabase SQL Editor and Run.

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS opening_hours JSONB;

COMMENT ON COLUMN public.restaurants.opening_hours IS
  'Weekly hours keyed by weekday 0-6 (JS getDay). Each day: { closed, open, close } with HH:MM times.';

-- Sensible default for existing rows that have no hours yet
UPDATE public.restaurants
SET opening_hours = '{
  "0": {"closed": false, "open": "11:00", "close": "22:00"},
  "1": {"closed": false, "open": "11:00", "close": "22:00"},
  "2": {"closed": false, "open": "11:00", "close": "22:00"},
  "3": {"closed": false, "open": "11:00", "close": "22:00"},
  "4": {"closed": false, "open": "11:00", "close": "22:00"},
  "5": {"closed": false, "open": "11:00", "close": "22:00"},
  "6": {"closed": false, "open": "11:00", "close": "22:00"}
}'::jsonb
WHERE opening_hours IS NULL;
