export type UserRole = "customer" | "restaurant" | "driver" | "admin";
export type DeliveryEtaRange = "15-30" | "30-60" | "60+";
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
  payment_qr_url: string | null;
  created_at: string;
}

/** 0 = Sunday … 6 = Saturday (matches Date.getDay()). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DayHours {
  closed: boolean;
  /** Local time "HH:MM" (24h), ignored when closed. */
  open: string;
  /** Local time "HH:MM" (24h), ignored when closed. */
  close: string;
}

export type OpeningHours = Record<Weekday, DayHours>;

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
  delivery_eta_range: DeliveryEtaRange | null;
  is_open: boolean;
  opening_hours: OpeningHours | null;
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
  whatsapp: string | null;
  payment_receipt_url: string | null;
  offered_driver_id: string | null;
  offer_expires_at: string | null;
  declined_driver_ids: string[] | null;
  restaurant_ready_at: string | null;
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

export type PaymentRequestStatus = "pending" | "paid" | "rejected";
export type PaymentPayeeType = "restaurant" | "driver";

export interface PaymentRequest {
  id: string;
  order_id: string;
  payee_type: PaymentPayeeType;
  payee_user_id: string;
  restaurant_id: string | null;
  driver_id: string | null;
  amount: number;
  status: PaymentRequestStatus;
  qr_image_url: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  orders?: Order;
  restaurants?: Restaurant;
  profiles?: Profile;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  restaurantId: string;
  restaurantName: string;
}
