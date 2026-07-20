-- Allow admin to confirm orders directly from "placed" (skip money_paid)
-- Run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION auto_in_progress_on_confirm()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status IN ('money_paid', 'placed') THEN
    NEW.status = 'in_progress';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
