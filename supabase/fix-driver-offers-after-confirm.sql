-- Fix driver offers after Pedido confirmado
-- Paste this whole script in Supabase SQL Editor and Run

-- Delivery stays at confirmed (unless an older trigger already moved it to in_progress).
-- Pickup still auto-moves to in_progress.
CREATE OR REPLACE FUNCTION auto_in_progress_on_confirm()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status IN ('money_paid', 'placed') THEN
    IF NEW.order_type = 'pickup' THEN
      NEW.status = 'in_progress';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eligible statuses: confirmed OR in_progress (never placed)
-- in_progress is included because some DBs still auto-advance after confirm.
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
      AND status IN ('confirmed', 'in_progress')
      AND order_type = 'delivery'
      AND driver_id IS NULL
  ) THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM orders
    WHERE id = p_order_id
      AND offered_driver_id IS NOT NULL
      AND offer_expires_at IS NOT NULL
      AND offer_expires_at > NOW()
  ) THEN
    RETURN (SELECT offered_driver_id FROM orders WHERE id = p_order_id);
  END IF;

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
    AND status IN ('confirmed', 'in_progress')
    AND order_type = 'delivery'
    AND offered_driver_id = v_driver_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

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
  UPDATE orders
  SET offered_driver_id = NULL,
      offer_expires_at = NULL
  WHERE offered_driver_id IS NOT NULL
    AND (
      driver_id IS NOT NULL
      OR order_type <> 'delivery'
      OR status NOT IN ('confirmed', 'in_progress')
    );

  FOR r IN
    SELECT id FROM orders
    WHERE status IN ('confirmed', 'in_progress')
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

CREATE OR REPLACE FUNCTION offer_delivery_on_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_type = 'delivery'
     AND NEW.driver_id IS NULL
     AND NEW.status IN ('confirmed', 'in_progress')
     AND (
       TG_OP = 'INSERT'
       OR OLD.status IS DISTINCT FROM NEW.status
       OR OLD.order_type IS DISTINCT FROM NEW.order_type
       OR OLD.driver_id IS DISTINCT FROM NEW.driver_id
     )
  THEN
    -- Never offer on first placement
    IF NEW.status = 'placed' OR NEW.status = 'money_paid' THEN
      RETURN NEW;
    END IF;
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
        AND status IN ('confirmed', 'in_progress')
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
            AND o.status IN ('confirmed', 'in_progress')
            AND o.driver_id IS NULL
        )
      )
    )
  );

SELECT refresh_delivery_offers();
