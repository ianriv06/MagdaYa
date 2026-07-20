-- Random one-driver-at-a-time delivery offers
-- Run in Supabase SQL Editor

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS offered_driver_id UUID REFERENCES drivers(id);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS offer_expires_at TIMESTAMPTZ;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS declined_driver_ids UUID[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_orders_offered_driver
  ON orders(offered_driver_id)
  WHERE offered_driver_id IS NOT NULL AND driver_id IS NULL;

-- Pick a random online driver (excluding declined / already busy) and offer the order for 12s
CREATE OR REPLACE FUNCTION assign_delivery_offer(p_order_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id UUID;
  v_declined UUID[];
BEGIN
  SELECT COALESCE(declined_driver_ids, '{}')
  INTO v_declined
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM orders
    WHERE id = p_order_id
      AND status = 'confirmed'
      AND order_type = 'delivery'
      AND driver_id IS NULL
  ) THEN
    RETURN NULL;
  END IF;

  -- Keep an active (non-expired) offer as-is
  IF EXISTS (
    SELECT 1 FROM orders
    WHERE id = p_order_id
      AND offered_driver_id IS NOT NULL
      AND offer_expires_at IS NOT NULL
      AND offer_expires_at > NOW()
  ) THEN
    RETURN (SELECT offered_driver_id FROM orders WHERE id = p_order_id);
  END IF;

  -- Expire previous offer into declined list
  UPDATE orders
  SET declined_driver_ids = CASE
        WHEN offered_driver_id IS NOT NULL
          AND NOT (offered_driver_id = ANY(COALESCE(declined_driver_ids, '{}')))
        THEN array_append(COALESCE(declined_driver_ids, '{}'), offered_driver_id)
        ELSE COALESCE(declined_driver_ids, '{}')
      END,
      offered_driver_id = NULL,
      offer_expires_at = NULL
  WHERE id = p_order_id
    AND offered_driver_id IS NOT NULL
    AND (offer_expires_at IS NULL OR offer_expires_at <= NOW());

  SELECT COALESCE(declined_driver_ids, '{}') INTO v_declined
  FROM orders WHERE id = p_order_id;

  SELECT d.id INTO v_driver_id
  FROM drivers d
  WHERE d.is_available = true
    AND NOT (d.id = ANY(v_declined))
    AND NOT EXISTS (
      SELECT 1 FROM orders o
      WHERE o.driver_id = d.id
        AND o.status IN ('confirmed', 'in_progress', 'on_the_way')
    )
  ORDER BY random()
  LIMIT 1;

  -- No eligible drivers left — keep declined list so rejectors are never re-offered
  IF v_driver_id IS NULL THEN
    UPDATE orders
    SET offered_driver_id = NULL,
        offer_expires_at = NULL
    WHERE id = p_order_id;
    RETURN NULL;
  END IF;

  UPDATE orders
  SET offered_driver_id = v_driver_id,
      offer_expires_at = NOW() + INTERVAL '18 seconds'
  WHERE id = p_order_id;

  RETURN v_driver_id;
END;
$$;

-- Current offered driver rejects (or times out) → offer to another online driver
CREATE OR REPLACE FUNCTION reject_delivery_offer(p_order_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id UUID;
BEGIN
  SELECT id INTO v_driver_id FROM drivers WHERE user_id = auth.uid();
  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Not a driver';
  END IF;

  UPDATE orders
  SET declined_driver_ids = CASE
        WHEN v_driver_id = ANY(COALESCE(declined_driver_ids, '{}'))
        THEN COALESCE(declined_driver_ids, '{}')
        ELSE array_append(COALESCE(declined_driver_ids, '{}'), v_driver_id)
      END,
      offered_driver_id = NULL,
      offer_expires_at = NULL
  WHERE id = p_order_id
    AND driver_id IS NULL
    AND (offered_driver_id IS NULL OR offered_driver_id = v_driver_id);

  RETURN assign_delivery_offer(p_order_id);
END;
$$;

-- Offered driver accepts → becomes assigned driver
CREATE OR REPLACE FUNCTION accept_delivery_offer(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id UUID;
  v_updated INTEGER;
BEGIN
  SELECT id INTO v_driver_id FROM drivers WHERE user_id = auth.uid();
  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Not a driver';
  END IF;

  UPDATE orders
  SET driver_id = v_driver_id,
      offered_driver_id = NULL,
      offer_expires_at = NULL
  WHERE id = p_order_id
    AND driver_id IS NULL
    AND status = 'confirmed'
    AND order_type = 'delivery'
    AND offered_driver_id = v_driver_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- Sweep: assign / refresh expired offers for all ready delivery orders
CREATE OR REPLACE FUNCTION refresh_delivery_offers()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  n INTEGER := 0;
BEGIN
  FOR r IN
    SELECT id FROM orders
    WHERE status = 'confirmed'
      AND order_type = 'delivery'
      AND driver_id IS NULL
      AND (
        offered_driver_id IS NULL
        OR offer_expires_at IS NULL
        OR offer_expires_at <= NOW()
      )
    ORDER BY created_at ASC
  LOOP
    PERFORM assign_delivery_offer(r.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- When an order becomes ready for delivery, offer it to a random online driver
CREATE OR REPLACE FUNCTION offer_delivery_on_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed'
     AND NEW.order_type = 'delivery'
     AND NEW.driver_id IS NULL
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.order_type IS DISTINCT FROM NEW.order_type)
  THEN
    PERFORM assign_delivery_offer(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_ready_for_delivery ON orders;
CREATE TRIGGER on_order_ready_for_delivery
  AFTER INSERT OR UPDATE OF status, order_type, driver_id ON orders
  FOR EACH ROW
  EXECUTE FUNCTION offer_delivery_on_ready();

GRANT EXECUTE ON FUNCTION assign_delivery_offer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_delivery_offer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_delivery_offer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_delivery_offers() TO authenticated;

-- Drivers only see orders offered to them (or already assigned)
DROP POLICY IF EXISTS "Customers see own orders" ON orders;
CREATE POLICY "Customers see own orders"
  ON orders FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid()
    OR get_user_role() = 'admin'
    OR EXISTS (SELECT 1 FROM restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM drivers d WHERE d.id = driver_id AND d.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.user_id = auth.uid()
        AND d.id = offered_driver_id
        AND status = 'confirmed'
        AND driver_id IS NULL
        AND order_type = 'delivery'
    )
  );

DROP POLICY IF EXISTS "View order items with order access" ON order_items;
CREATE POLICY "View order items with order access"
  ON order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o WHERE o.id = order_id AND (
        o.customer_id = auth.uid()
        OR get_user_role() = 'admin'
        OR EXISTS (SELECT 1 FROM restaurants r WHERE r.id = o.restaurant_id AND r.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM drivers d WHERE d.id = o.driver_id AND d.user_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM drivers d
          WHERE d.user_id = auth.uid()
            AND d.id = o.offered_driver_id
            AND o.status = 'confirmed'
            AND o.driver_id IS NULL
        )
      )
    )
  );
