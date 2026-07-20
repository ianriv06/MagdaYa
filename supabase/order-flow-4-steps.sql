-- 4-step order flow + accept keeps status at confirmed
-- Paste in Supabase SQL Editor and Run

-- Never auto-skip confirmed → in_progress (timeline step 2 stays until pickup)
CREATE OR REPLACE FUNCTION auto_in_progress_on_confirm()
RETURNS TRIGGER AS $$
BEGIN
  -- No-op: delivery and pickup both stay at "confirmed" after admin approve
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Driver accept: claim order but stay on "Pedido confirmado" until pickup
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

-- Offer only while unassigned and confirmed/in_progress (after admin approve)
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
