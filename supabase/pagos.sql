-- Pagos: payment QR on profiles, restaurant-ready flag, payment_requests
-- Paste into Supabase SQL Editor and Run

-- 1) Payment QR for restaurant owners & drivers
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payment_qr_url TEXT;

COMMENT ON COLUMN public.profiles.payment_qr_url IS
  'QR image URL used to receive MagdaYa payouts (restaurants & drivers).';

-- 2) Restaurant marks order ready → appears in their Pagos tab
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS restaurant_ready_at TIMESTAMPTZ;

COMMENT ON COLUMN public.orders.restaurant_ready_at IS
  'Set when restaurant taps Orden lista para recoger; order moves to Pagos.';

-- 3) Payout requests from restaurants/drivers → admin Pagos
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payee_type TEXT NOT NULL CHECK (payee_type IN ('restaurant', 'driver')),
  payee_user_id UUID NOT NULL REFERENCES public.profiles(id),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'rejected')),
  qr_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  UNIQUE (order_id, payee_type)
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_status
  ON public.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_payee
  ON public.payment_requests(payee_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_order
  ON public.payment_requests(order_id);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payees see own payment requests" ON public.payment_requests;
CREATE POLICY "Payees see own payment requests"
  ON public.payment_requests FOR SELECT TO authenticated
  USING (
    payee_user_id = auth.uid()
    OR public.get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Payees create own payment requests" ON public.payment_requests;
CREATE POLICY "Payees create own payment requests"
  ON public.payment_requests FOR INSERT TO authenticated
  WITH CHECK (
    payee_user_id = auth.uid()
    AND public.get_user_role() IN ('restaurant', 'driver')
  );

DROP POLICY IF EXISTS "Admin update payment requests" ON public.payment_requests;
CREATE POLICY "Admin update payment requests"
  ON public.payment_requests FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

GRANT SELECT, INSERT ON public.payment_requests TO authenticated;
GRANT ALL ON public.payment_requests TO postgres, service_role;
-- Admin updates via authenticated role
GRANT UPDATE ON public.payment_requests TO authenticated;

-- Realtime for admin / payee UIs
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_requests;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
