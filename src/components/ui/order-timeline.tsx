"use client";

import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, getStatusIndex } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-2xl bg-red-50 p-4 text-center text-danger font-medium">
        Este pedido fue cancelado
      </div>
    );
  }

  const current = getStatusIndex(status);

  return (
    <div className="space-y-0">
      {ORDER_STATUS_FLOW.map((step, i) => {
        const done = i <= current;
        const active = i === current;
        return (
          <div key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "size-8 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors",
                  done
                    ? "bg-brand border-brand text-white"
                    : "bg-surface border-border text-muted"
                )}
              >
                {done ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </div>
              {i < ORDER_STATUS_FLOW.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-6 my-1",
                    i < current ? "bg-brand" : "bg-border"
                  )}
                />
              )}
            </div>
            <div className={cn("pb-5 pt-1", active && "animate-pulse-soft")}>
              <p
                className={cn(
                  "font-semibold text-sm",
                  done ? "text-ink" : "text-muted"
                )}
              >
                {ORDER_STATUS_LABELS[step]}
              </p>
              {active && (
                <p className="text-xs text-brand font-medium mt-0.5">
                  Estado actual
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
