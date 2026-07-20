quita-- Add WhatsApp contact number on orders
-- Run in Supabase SQL Editor

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;
