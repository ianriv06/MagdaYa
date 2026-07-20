"use client";

import {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  getStatusIndex,
} from "@/lib/utils";
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
  const isActive = status !== "delivered";
  const cascadeDuration = (current + 1) * 0.55;

  return (
    <div className="space-y-0">
      {ORDER_STATUS_FLOW.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const upcoming = i > current;
        const connectorDone = i < current;
        const connectorActive = i === current && isActive;

        return (
          <div key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "size-8 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors",
                  done || (active && !isActive)
                    ? "bg-brand border-brand text-white"
                    : active
                      ? "bg-brand border-brand text-white animate-timeline-ring"
                      : "bg-surface border-border text-muted"
                )}
              >
                {done || (active && !isActive) ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : active ? (
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full rounded-full bg-white opacity-80 animate-ping" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-white" />
                  </span>
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </div>
              {i < ORDER_STATUS_FLOW.length - 1 && (
                <div
                  className={cn(
                    "relative w-0.5 flex-1 min-h-7 my-1 overflow-hidden rounded-full",
                    connectorDone || connectorActive ? "bg-brand/20" : "bg-border"
                  )}
                >
                  {connectorDone && (
                    <div className="absolute inset-0 bg-brand" />
                  )}
                  {connectorActive && (
                    <div className="absolute inset-0 bg-brand/25" />
                  )}
                  {isActive && i <= current && (
                    <div
                      className="absolute inset-x-0 h-3 -translate-x-0 bg-gradient-to-b from-transparent via-white to-transparent opacity-90 animate-timeline-travel"
                      style={{
                        animationDuration: `${cascadeDuration}s`,
                        animationDelay: `${i * 0.55}s`,
                      }}
                    />
                  )}
                  {connectorActive && (
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-brand/20 via-brand to-brand/20 animate-timeline-flow" />
                  )}
                </div>
              )}
            </div>
            <div className={cn("pb-5 pt-1", active && isActive && "animate-pulse-soft")}>
              <p
                className={cn(
                  "font-semibold text-sm",
                  done || active ? "text-ink" : "text-muted"
                )}
              >
                {ORDER_STATUS_LABELS[step]}
              </p>
              {active && isActive && (
                <p className="text-xs text-brand font-medium mt-0.5">
                  En curso…
                </p>
              )}
              {active && !isActive && (
                <p className="text-xs text-brand font-medium mt-0.5">
                  Completado
                </p>
              )}
              {upcoming && (
                <p className="text-xs text-muted mt-0.5">Pendiente</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
