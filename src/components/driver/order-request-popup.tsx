"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DRIVER_CLIENT_LOCATION_LABEL,
  DRIVER_OFFER_SECONDS,
  formatCurrency,
  getDriverEarnings,
} from "@/lib/utils";
import type { Order } from "@/lib/types";
import { MapPin, Store } from "lucide-react";

const COUNTDOWN_SECONDS = DRIVER_OFFER_SECONDS;
const CIRCLE_SIZE = 72;
const STROKE = 5;
const RADIUS = (CIRCLE_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function OrderRequestPopup({
  order,
  accepting,
  onAccept,
  onReject,
}: {
  order: Order;
  accepting?: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const acceptingRef = useRef(Boolean(accepting));
  const finishedRef = useRef(false);

  useEffect(() => {
    acceptingRef.current = Boolean(accepting);
  }, [accepting]);

  useEffect(() => {
    finishedRef.current = false;
    setSecondsLeft(COUNTDOWN_SECONDS);
    const started = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = (Date.now() - started) / 1000;
      const left = Math.max(0, COUNTDOWN_SECONDS - elapsed);
      setSecondsLeft(left);
      if (left <= 0) {
        window.clearInterval(tick);
        if (!finishedRef.current && !acceptingRef.current) {
          finishedRef.current = true;
          onReject();
        }
      }
    }, 50);
    return () => window.clearInterval(tick);
    // Restart only when a new order is shown
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  const progress = secondsLeft / COUNTDOWN_SECONDS;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const displaySeconds = Math.ceil(secondsLeft);
  const itemCount =
    order.order_items?.reduce((s, i) => s + i.quantity, 0) ?? 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-request-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-surface border border-border shadow-xl p-5 space-y-5 animate-slide-up">
        <div className="flex items-start gap-4">
          <div
            className="relative shrink-0"
            style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
            aria-hidden
          >
            <svg
              width={CIRCLE_SIZE}
              height={CIRCLE_SIZE}
              className="-rotate-90"
            >
              <circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="var(--border)"
                strokeWidth={STROKE}
              />
              <circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="var(--brand)"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                className="transition-[stroke-dashoffset] duration-75 ease-linear"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-xl tabular-nums text-ink">
              {displaySeconds}
            </span>
          </div>

          <div className="min-w-0 flex-1 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              Nueva solicitud
            </p>
            <h2
              id="order-request-title"
              className="font-display text-xl font-bold leading-tight truncate"
            >
              {order.restaurants?.name || "Restaurante"}
            </h2>
            <p className="text-sm text-muted mt-0.5">
              {formatCurrency(getDriverEarnings(order))}
              {itemCount > 0 ? ` · ${itemCount} productos` : ""}
            </p>
          </div>
        </div>

        <div className="space-y-2.5 text-sm rounded-2xl bg-subtle/80 p-3.5">
          <div className="flex items-start gap-2">
            <Store className="size-4 text-danger mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Recoger
              </p>
              <p className="font-medium leading-snug">
                {order.restaurants?.address || "—"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="size-4 text-info mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Entregar
              </p>
              <p className="font-medium leading-snug">
                {DRIVER_CLIENT_LOCATION_LABEL}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              if (finishedRef.current) return;
              finishedRef.current = true;
              onReject();
            }}
            disabled={accepting}
          >
            Rechazar
          </Button>
          <Button
            className="flex-1"
            loading={accepting}
            onClick={() => {
              if (finishedRef.current) return;
              finishedRef.current = true;
              onAccept();
            }}
          >
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  );
}
