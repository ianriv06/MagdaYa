-- Allow admin to confirm orders directly from "placed" (skip money_paid)
-- Pickup auto-advances to in_progress; delivery stays confirmed for driver offers.
-- Run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION auto_in_progress_on_confirm()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
