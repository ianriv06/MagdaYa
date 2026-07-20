import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { OrderStatus, UserRole, DeliveryEtaRange } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  const value = Number.isFinite(n) ? n : 0;
  return `Bs ${value.toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Flat delivery fee in Bs */
export const DELIVERY_FEE = 3;

/** Platform service fee in Bs (applied to every order) */
export const PLATFORM_FEE = 3;

/** Synthetic email domain so Supabase Auth can use phone as the login identity. */
export const PHONE_AUTH_DOMAIN = "phone.magdaya.app";

/** Digits only from a phone string (e.g. "71234567" or "+591 7123-4567"). */
export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

/** Maps a phone number to the synthetic email used for password auth. */
export function phoneToAuthEmail(phone: string) {
  const digits = normalizePhone(phone);
  if (!digits) return "";
  return `${digits}@${PHONE_AUTH_DOMAIN}`;
}

export function isPhoneAuthEmail(email: string | null | undefined) {
  return Boolean(email?.endsWith(`@${PHONE_AUTH_DOMAIN}`));
}

export const DELIVERY_ETA_OPTIONS: {
  value: DeliveryEtaRange;
  label: string;
}[] = [
  { value: "15-30", label: "15-30 min" },
  { value: "30-60", label: "30-60 min" },
  { value: "60+", label: "60+ min" },
];

export const DEFAULT_DELIVERY_ETA: DeliveryEtaRange = "15-30";

export function normalizeDeliveryEtaRange(
  range: string | null | undefined,
  etaMinutes?: number | null
): DeliveryEtaRange {
  if (range === "15-30" || range === "30-60" || range === "60+") return range;
  if (etaMinutes != null && Number.isFinite(Number(etaMinutes))) {
    const n = Number(etaMinutes);
    if (n <= 30) return "15-30";
    if (n <= 60) return "30-60";
    return "60+";
  }
  return DEFAULT_DELIVERY_ETA;
}

/** Representative minutes for a range (used when delivery_eta_range column is missing). */
export function deliveryEtaToMinutes(range: DeliveryEtaRange): number {
  switch (range) {
    case "30-60":
      return 45;
    case "60+":
      return 75;
    default:
      return 25;
  }
}

export function formatDeliveryEta(
  range: string | null | undefined,
  etaMinutes?: number | null
) {
  const normalized = normalizeDeliveryEtaRange(range, etaMinutes);
  return (
    DELIVERY_ETA_OPTIONS.find((o) => o.value === normalized)?.label ??
    "15-30 min"
  );
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Pedido realizado",
  money_paid: "Pago recibido por el comercio",
  confirmed: "Pedido confirmado",
  in_progress: "Pedido en preparación",
  on_the_way: "Pedido en camino",
  delivered: "Pedido entregado",
  cancelled: "Cancelado",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  customer: "Cliente",
  restaurant: "Restaurante",
  driver: "Repartidor",
  admin: "Super Admin",
};

/** Customer-facing progress steps (skips legacy money_paid). */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "placed",
  "confirmed",
  "in_progress",
  "on_the_way",
  "delivered",
];

export function getStatusIndex(status: OrderStatus) {
  // Legacy money_paid — treat as still awaiting admin confirm
  if (status === "money_paid") {
    return ORDER_STATUS_FLOW.indexOf("placed");
  }
  return ORDER_STATUS_FLOW.indexOf(status);
}

export function getDashboardPath(role: string) {
  switch (role) {
    case "restaurant":
      return "/restaurant";
    case "driver":
      return "/driver";
    case "admin":
      return "/admin";
    default:
      return "/";
  }
}

/** Shown to drivers for delivery orders until the client shares their location. */
export const DRIVER_CLIENT_LOCATION_LABEL =
  "Pedir ubicación al cliente por WhatsApp";

export function getDriverEarnings(order: { delivery_fee?: number | null }) {
  const fee = Number(order.delivery_fee);
  return Number.isFinite(fee) && fee > 0 ? fee : DELIVERY_FEE;
}

const declinedOrdersKey = (driverId: string) =>
  `magdaya-driver-declined:${driverId}`;

export function getDeclinedOrderIds(driverId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(declinedOrdersKey(driverId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function declineOrderForDriver(driverId: string, orderId: string) {
  const ids = new Set(getDeclinedOrderIds(driverId));
  ids.add(orderId);
  localStorage.setItem(
    declinedOrdersKey(driverId),
    JSON.stringify([...ids])
  );
}
