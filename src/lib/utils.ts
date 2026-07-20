import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { OrderStatus } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n || 0);
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Order Placed",
  money_paid: "Money Paid to Commerce",
  confirmed: "Order Confirmed",
  in_progress: "Order in Progress",
  on_the_way: "Order on the Way",
  delivered: "Order Delivered",
  cancelled: "Cancelled",
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
