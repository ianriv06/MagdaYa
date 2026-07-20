import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type {
  DayHours,
  OpeningHours,
  OrderStatus,
  Restaurant,
  UserRole,
  DeliveryEtaRange,
  Weekday,
} from "@/lib/types";

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

/** Weekday labels in display order (Mon → Sun). Value is JS getDay(). */
export const WEEKDAY_OPTIONS: { day: Weekday; label: string }[] = [
  { day: 1, label: "Lunes" },
  { day: 2, label: "Martes" },
  { day: 3, label: "Miércoles" },
  { day: 4, label: "Jueves" },
  { day: 5, label: "Viernes" },
  { day: 6, label: "Sábado" },
  { day: 0, label: "Domingo" },
];

const DEFAULT_DAY_HOURS: DayHours = {
  closed: false,
  open: "11:00",
  close: "22:00",
};

export function defaultOpeningHours(): OpeningHours {
  return {
    0: { ...DEFAULT_DAY_HOURS },
    1: { ...DEFAULT_DAY_HOURS },
    2: { ...DEFAULT_DAY_HOURS },
    3: { ...DEFAULT_DAY_HOURS },
    4: { ...DEFAULT_DAY_HOURS },
    5: { ...DEFAULT_DAY_HOURS },
    6: { ...DEFAULT_DAY_HOURS },
  };
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function minutesFromMidnight(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function normalizeOpeningHours(
  raw: OpeningHours | null | undefined
): OpeningHours {
  const base = defaultOpeningHours();
  if (!raw || typeof raw !== "object") return base;

  for (const { day } of WEEKDAY_OPTIONS) {
    const entry = (raw as Record<string, unknown>)[String(day)];
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Partial<DayHours>;
    const open =
      typeof e.open === "string" && isValidTime(e.open)
        ? e.open
        : DEFAULT_DAY_HOURS.open;
    const close =
      typeof e.close === "string" && isValidTime(e.close)
        ? e.close
        : DEFAULT_DAY_HOURS.close;
    base[day] = {
      closed: Boolean(e.closed),
      open,
      close,
    };
  }
  return base;
}

/** Returns an error message if hours are invalid, otherwise null. */
export function validateOpeningHours(hours: OpeningHours): string | null {
  for (const { day, label } of WEEKDAY_OPTIONS) {
    const d = hours[day];
    if (d.closed) continue;
    if (!isValidTime(d.open) || !isValidTime(d.close)) {
      return `Horario inválido para ${label}`;
    }
    if (minutesFromMidnight(d.close) <= minutesFromMidnight(d.open)) {
      return `${label}: la hora de cierre debe ser después de la apertura`;
    }
  }
  return null;
}

export function isWithinOpeningHours(
  hours: OpeningHours | null | undefined,
  now = new Date()
): boolean {
  // Missing schedule → treat as always within hours (legacy rows)
  if (!hours) return true;
  const normalized = normalizeOpeningHours(hours);
  const day = now.getDay() as Weekday;
  const today = normalized[day];
  if (today.closed) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  const open = minutesFromMidnight(today.open);
  const close = minutesFromMidnight(today.close);
  return current >= open && current < close;
}

/** Manual is_open override + weekly schedule. */
export function isRestaurantAcceptingOrders(
  restaurant: Pick<Restaurant, "is_open" | "opening_hours">,
  now = new Date()
): boolean {
  if (!restaurant.is_open) return false;
  return isWithinOpeningHours(restaurant.opening_hours, now);
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Pedido realizado",
  money_paid: "Pago recibido por el comercio",
  confirmed: "Pedido confirmado",
  in_progress: "Pedido confirmado",
  on_the_way: "En camino hacia ti",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  customer: "Cliente",
  restaurant: "Restaurante",
  driver: "Repartidor",
  admin: "Super Admin",
};

/** Customer-facing progress steps. */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "placed",
  "confirmed",
  "on_the_way",
  "delivered",
];

export function getStatusIndex(status: OrderStatus) {
  // Legacy money_paid — still awaiting admin confirm
  if (status === "money_paid") {
    return ORDER_STATUS_FLOW.indexOf("placed");
  }
  // Legacy in_progress — driver accepted, food not picked up yet → still "Pedido confirmado"
  if (status === "in_progress") {
    return ORDER_STATUS_FLOW.indexOf("confirmed");
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

/** Food subtotal owed to the restaurant (excludes delivery + platform fees). */
export function getRestaurantEarnings(order: { subtotal?: number | null }) {
  const n = Number(order.subtotal);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Seconds a driver has to accept before the offer moves to someone else. */
export const DRIVER_OFFER_SECONDS = 18;

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

/** Persist a reject so this driver never sees the order again on this device. */
export function declineOrderForDriver(driverId: string, orderId: string) {
  const ids = new Set(getDeclinedOrderIds(driverId));
  ids.add(orderId);
  localStorage.setItem(declinedOrdersKey(driverId), JSON.stringify([...ids]));
}
