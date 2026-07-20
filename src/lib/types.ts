export type UserRole = "customer" | "restaurant" | "driver" | "admin";
export type OrderType = "delivery" | "pickup";
export type OrderStatus =
  | "placed"
  | "money_paid"
  | "confirmed"
  | "in_progress"
  | "on_the_way"
  | "delivered"
  | "cancelled";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_url: string | null;
  cuisine: string | null;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  delivery_fee: number;
  eta_minutes: number;
  is_open: boolean;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
}

export interface Driver {
  id: string;
  user_id: string;
  is_available: boolean;
  current_lat: number | null;
  current_lng: number | null;
  vehicle_info: string | null;
  profiles?: Profile;
}

export interface Order {
  id: string;
  customer_id: string;
  restaurant_id: string;
  driver_id: string | null;
  order_type: OrderType;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  customer_notes: string | null;
  status_updated_at: string;
  created_at: string;
  restaurants?: Restaurant;
  order_items?: OrderItem[];
  profiles?: Profile;
  drivers?: Driver;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
}

export interface PaymentSettings {
  id: string;
  qr_image_url: string | null;
  updated_at: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  restaurantId: string;
  restaurantName: string;
}
