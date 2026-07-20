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
export const DELIVERY_FEE = 20;

export type DeliveryEtaRange = "15-30" | "30-60" | "60+";

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

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "placed",
  "money_paid",
  "confirmed",
  "in_progress",
  "on_the_way",
  "delivered",
];

export function getStatusIndex(status: OrderStatus) {
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
