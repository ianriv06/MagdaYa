-- 18s offers + never re-offer to a driver who tapped Rechazar
-- Paste in Supabase SQL Editor and Run

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

  -- Expire current offer into declined (timeout) so they are not offered again
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

  -- Keep declined list forever for this order (do not clear on empty pool)
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
