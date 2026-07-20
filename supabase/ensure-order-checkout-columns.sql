-- Ensure checkout columns exist (run in Supabase SQL Editor)
-- Fixes order placement failures after WhatsApp / receipt features

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT;
