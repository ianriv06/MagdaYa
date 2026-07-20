"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DriverLayout,
  DriverAvailabilityToggle,
} from "@/components/driver/driver-layout";
import { OrderRequestPopup } from "@/components/driver/order-request-popup";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  declineOrderForDriver,
  DRIVER_CLIENT_LOCATION_LABEL,
  DRIVER_OFFER_SECONDS,
  formatCurrency,
  getDeclinedOrderIds,
  getDriverEarnings,
} from "@/lib/utils";
import type { Driver, Order } from "@/lib/types";
import { MapPin, Store } from "lucide-react";
import { useRouter } from "next/navigation";

function isMissingOfferSupport(err: unknown) {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message?: string }).message)
      : String(err ?? "");
  return /offered_driver_id|offer_expires_at|declined_driver_ids|assign_delivery_offer|reject_delivery_offer|accept_delivery_offer|refresh_delivery_offers|schema cache|Could not find the function/i.test(
    msg
  );
}

export default function DriverAvailablePage() {
  return (
    <DriverLayout title="Solicitudes disponibles">
      {(driver) => <AvailableList driver={driver} />}
    </DriverLayout>
  );
}

function AvailableList({ driver }: { driver: Driver }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [popupOrder, setPopupOrder] = useState<Order | null>(null);
  const [offerMode, setOfferMode] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  const load = useCallback(async () => {
    let useOffers = offerMode;

    if (useOffers) {
      const refresh = await supabase.rpc("refresh_delivery_offers");
      if (refresh.error && isMissingOfferSupport(refresh.error)) {
        useOffers = false;
        setOfferMode(false);
      }
    }

    if (useOffers) {
      const { data, error } = await supabase
        .from("orders")
        .select("*, restaurants(*), order_items(*)")
        .in("status", ["confirmed", "in_progress"])
        .eq("order_type", "delivery")
        .eq("offered_driver_id", driver.id)
        .is("driver_id", null)
        .order("created_at", { ascending: true });

      if (error && isMissingOfferSupport(error)) {
        useOffers = false;
        setOfferMode(false);
      } else if (!error) {
        const declined = new Set(getDeclinedOrderIds(driver.id));
        const offered = (data || []).filter((o) => !declined.has(o.id));
        setOrders(offered);
        setPopupOrder((current) => {
          if (!driver.is_available) return null;
          if (current && offered.some((o) => o.id === current.id)) return current;
          return offered[0] ?? null;
        });
        return;
      } else {
        useOffers = false;
        setOfferMode(false);
      }
    }

    // Legacy fallback: all drivers see unassigned delivery orders
    const { data } = await supabase
      .from("orders")
      .select("*, restaurants(*), order_items(*)")
      .in("status", ["confirmed", "in_progress"])
      .eq("order_type", "delivery")
      .is("driver_id", null)
      .order("created_at", { ascending: true });

    const declined = new Set(getDeclinedOrderIds(driver.id));
    const available = (data || []).filter((o) => !declined.has(o.id));
    setOrders(available);
    setPopupOrder((current) => {
      if (!driver.is_available) return null;
      if (current && available.some((o) => o.id === current.id)) return current;
      return available[0] ?? null;
    });
  }, [driver.id, driver.is_available, offerMode, supabase]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`driver-offers-${driver.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load()
      )
      .subscribe();

    const interval = window.setInterval(() => {
      if (driver.is_available) load();
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver.id, driver.is_available, offerMode]);

  const accept = async (orderId: string) => {
    setLoadingId(orderId);

    if (offerMode) {
      const { data, error } = await supabase.rpc("accept_delivery_offer", {
        p_order_id: orderId,
      });
      if (!error && data === true) {
        setPopupOrder(null);
        router.push("/driver/active");
        return;
      }
      if (error && isMissingOfferSupport(error)) {
        setOfferMode(false);
      } else if (!error) {
        setLoadingId(null);
        await load();
        return;
      }
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({ driver_id: driver.id, status: "in_progress" })
      .eq("id", orderId)
      .is("driver_id", null);

    if (!updateError) {
      setPopupOrder(null);
      router.push("/driver/active");
      return;
    }

    setLoadingId(null);
    await load();
  };

  const decline = async (orderId: string) => {
    declineOrderForDriver(driver.id, orderId);
    setPopupOrder((current) => (current?.id === orderId ? null : current));
    setOrders((prev) => prev.filter((o) => o.id !== orderId));

    if (offerMode) {
      const { error } = await supabase.rpc("reject_delivery_offer", {
        p_order_id: orderId,
      });
      if (error && isMissingOfferSupport(error)) {
        setOfferMode(false);
      }
    }

    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {orders.length}{" "}
          {orders.length === 1 ? "solicitud" : "solicitudes"}{" "}
          {offerMode ? "para ti" : "cerca"}
        </p>
        <DriverAvailabilityToggle driver={driver} onAvailabilityChange={load} />
      </div>

      {!driver.is_available && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
          Estás desconectado. Conéctate para recibir entregas.
        </div>
      )}

      {popupOrder && driver.is_available ? (
        <div className="flex min-h-[60vh] items-center justify-center py-6">
          <OrderRequestPopup
            order={popupOrder}
            accepting={loadingId === popupOrder.id}
            onAccept={() => accept(popupOrder.id)}
            onReject={() => decline(popupOrder.id)}
          />
        </div>
      ) : driver.is_available && orders.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="font-medium">Esperando solicitudes</p>
          <p className="text-sm mt-1">
            Cuando haya un pedido, te llegará un aviso de {DRIVER_OFFER_SECONDS}{" "}
            segundos.
          </p>
        </div>
      ) : !driver.is_available && orders.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="font-medium">No hay solicitudes</p>
          <p className="text-sm mt-1">
            Aparecerán aquí cuando estén listas para recoger.
          </p>
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-3xl bg-surface border border-border p-5 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">
                    {order.restaurants?.name}
                  </h3>
                  <p className="text-sm text-muted">
                    {formatCurrency(getDriverEarnings(order))} ·{" "}
                    {order.order_items?.reduce((s, i) => s + i.quantity, 0)}{" "}
                    productos
                  </p>
                </div>
                <span className="text-xs font-semibold bg-brand-light text-brand-dark px-2.5 py-1 rounded-full">
                  {offerMode ? "Para ti" : "Nuevo"}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Store className="size-4 text-danger mt-0.5 shrink-0" />
                  <span>{order.restaurants?.address}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="size-4 text-info mt-0.5 shrink-0" />
                  <span>{DRIVER_CLIENT_LOCATION_LABEL}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => decline(order.id)}
                >
                  Rechazar
                </Button>
                <Button
                  className="flex-1"
                  loading={loadingId === order.id}
                  onClick={() => accept(order.id)}
                >
                  Aceptar
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
