-- MagdaYa Food Delivery Schema
-- Run this in your Supabase SQL editor

-- Roles
CREATE TYPE user_role AS ENUM ('customer', 'restaurant', 'driver', 'admin');
CREATE TYPE order_type AS ENUM ('delivery', 'pickup');
CREATE TYPE order_status AS ENUM (
  'placed',
  'money_paid',
  'confirmed',
  'in_progress',
  'on_the_way',
  'delivered',
  'cancelled'
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Restaurants
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cover_url TEXT,
  cuisine TEXT,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL DEFAULT 40.7128,
  lng DOUBLE PRECISION NOT NULL DEFAULT -74.0060,
  rating NUMERIC(2,1) DEFAULT 4.5,
  delivery_fee NUMERIC(10,2) DEFAULT 20,
  eta_minutes INTEGER DEFAULT 20,
  delivery_eta_range TEXT NOT NULL DEFAULT '15-30'
    CHECK (delivery_eta_range IN ('15-30', '30-60', '60+')),
  is_open BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Menu categories
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Menu items
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Driver profiles
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  is_available BOOLEAN DEFAULT true,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  vehicle_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Global payment QR (single row managed by admin)
CREATE TABLE payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_image_url TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  driver_id UUID REFERENCES drivers(id),
  order_type order_type NOT NULL DEFAULT 'delivery',
  status order_status NOT NULL DEFAULT 'placed',
  subtotal NUMERIC(10,2) NOT NULL,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  delivery_address TEXT,
  delivery_lat DOUBLE PRECISION,
  delivery_lng DOUBLE PRECISION,
  customer_notes TEXT,
  whatsapp TEXT,
  payment_receipt_url TEXT,
  offered_driver_id UUID REFERENCES drivers(id),
  offer_expires_at TIMESTAMPTZ,
  declined_driver_ids UUID[] NOT NULL DEFAULT '{}',
  status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Order items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  image_url TEXT
);

-- Order status history
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  note TEXT,
  changed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_restaurants_owner ON restaurants(owner_id);
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_driver ON orders(driver_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_drivers_user ON drivers(user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::public.user_role,
      'customer'::public.user_role
    )
  );

  IF COALESCE(NEW.raw_user_meta_data->>'role', 'customer') = 'driver' THEN
    INSERT INTO public.drivers (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Status history helper
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_updated_at = NOW();
    INSERT INTO order_status_history (order_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_status_change
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- When admin confirms → stay at confirmed (no auto in_progress)
CREATE OR REPLACE FUNCTION auto_in_progress_on_confirm()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_confirmed
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION auto_in_progress_on_confirm();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by authenticated"
  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Restaurants: anyone can view, owners manage
CREATE POLICY "Anyone can view restaurants"
  ON restaurants FOR SELECT USING (true);
CREATE POLICY "Owners can insert restaurants"
  ON restaurants FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND get_user_role() = 'restaurant');
CREATE POLICY "Owners can update restaurants"
  ON restaurants FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR get_user_role() = 'admin');
CREATE POLICY "Owners can delete restaurants"
  ON restaurants FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR get_user_role() = 'admin');

-- Menu categories
CREATE POLICY "Anyone can view categories"
  ON menu_categories FOR SELECT USING (true);
CREATE POLICY "Restaurant owners manage categories"
  ON menu_categories FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM restaurants r WHERE r.id = restaurant_id AND (r.owner_id = auth.uid() OR get_user_role() = 'admin'))
  );

-- Menu items
CREATE POLICY "Anyone can view menu items"
  ON menu_items FOR SELECT USING (true);
CREATE POLICY "Restaurant owners manage menu items"
  ON menu_items FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM restaurants r WHERE r.id = restaurant_id AND (r.owner_id = auth.uid() OR get_user_role() = 'admin'))
  );

-- Drivers
CREATE POLICY "Authenticated can view drivers"
  ON drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Drivers update own record"
  ON drivers FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR get_user_role() = 'admin');
CREATE POLICY "Drivers insert own record"
  ON drivers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Payment settings
CREATE POLICY "Anyone can view payment QR"
  ON payment_settings FOR SELECT USING (true);
CREATE POLICY "Admin manages payment settings"
  ON payment_settings FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Orders
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

CREATE POLICY "Customers create orders"
  ON orders FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid() AND get_user_role() = 'customer');

CREATE POLICY "Authorized roles update orders"
  ON orders FOR UPDATE TO authenticated
  USING (
    customer_id = auth.uid()
    OR get_user_role() = 'admin'
    OR EXISTS (SELECT 1 FROM restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM drivers d WHERE d.id = driver_id AND d.user_id = auth.uid())
    OR (get_user_role() = 'driver' AND status = 'in_progress')
  );

-- Order items
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

CREATE POLICY "Customers insert order items"
  ON order_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.customer_id = auth.uid())
  );

-- Status history
CREATE POLICY "View status history with order access"
  ON order_status_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o WHERE o.id = order_id AND (
        o.customer_id = auth.uid()
        OR get_user_role() = 'admin'
        OR EXISTS (SELECT 1 FROM restaurants r WHERE r.id = o.restaurant_id AND r.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM drivers d WHERE d.id = o.driver_id AND d.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "System can insert status history"
  ON order_status_history FOR INSERT TO authenticated
  WITH CHECK (true);

-- Storage buckets (run in dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('menu-images', 'menu-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('restaurant-images', 'restaurant-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('payment-qr', 'payment-qr', true);

-- Seed payment settings row
INSERT INTO payment_settings (qr_image_url) VALUES (NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE order_status_history;
