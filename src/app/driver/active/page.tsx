"use client";

import { useEffect, useState } from "react";
import { DriverLayout } from "@/components/driver/driver-layout";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { OrderMap, type MapMarker } from "@/components/map/order-map";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DRIVER_CLIENT_LOCATION_LABEL,
  formatCurrency,
  getDriverEarnings,
} from "@/lib/utils";
import type { Driver, Order } from "@/lib/types";
import { CheckCircle2, Package } from "lucide-react";

export default function DriverActivePage() {
  return (
    <DriverLayout title="Entrega activa">
      {(driver) => <ActiveDelivery driver={driver} />}
    </DriverLayout>
  );
}

function ActiveDelivery({ driver }: { driver: Driver }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [confirmDeliver, setConfirmDeliver] = useState(false);
  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, restaurants(*), order_items(*), profiles:customer_id(*)")
      .eq("driver_id", driver.id)
      .in("status", ["confirmed", "in_progress", "on_the_way"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setOrder(data);
    setLoading(false);
  };

  useEffect(() => {
    load();

    // Live location updates
    let watchId: number | undefined;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(async (pos) => {
        await supabase
          .from("drivers")
          .update({
            current_lat: pos.coords.latitude,
            current_lng: pos.coords.longitude,
          })
          .eq("id", driver.id);
      });
    }

    const channel = supabase
      .channel("driver-active")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load()
      )
      .subscribe();

    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver.id]);

  const markPickedUp = async () => {
    if (!order) return;
    setUpdating(true);
    await supabase
      .from("orders")
      .update({ status: "on_the_way" })
      .eq("id", order.id);
    await load();
    setUpdating(false);
  };

  const markDelivered = async () => {
    if (!order) return;
    setUpdating(true);
    await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", order.id);
    setConfirmDeliver(false);
    await load();
    setUpdating(false);
  };

  if (loading) {
    return <p className="text-muted text-center py-12">Cargando…</p>;
  }

  if (!order) {
    return (
      <div className="text-center py-16 text-muted animate-slide-up">
        <Package className="size-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">No hay entrega activa</p>
        <p className="text-sm mt-1">
          Acepta una solicitud en Disponibles.
        </p>
      </div>
    );
  }

  const markers: MapMarker[] = [];
  if (order.restaurants) {
    markers.push({
      id: "restaurant",
      lat: order.restaurants.lat,
      lng: order.restaurants.lng,
      label: order.restaurants.name,
      type: "restaurant",
    });
  }
  if (order.delivery_lat && order.delivery_lng) {
    markers.push({
      id: "customer",
      lat: order.delivery_lat,
      lng: order.delivery_lng,
      label: order.profiles?.full_name || "Cliente",
      type: "customer",
    });
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <OrderMap markers={markers} className="h-56" />

      <div className="rounded-3xl bg-surface border border-border p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-bold">
              {order.restaurants?.name}
            </h2>
            <p className="text-sm text-muted">
              {order.profiles?.full_name} ·{" "}
              {formatCurrency(getDriverEarnings(order))}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide">
              Recoger
            </p>
            <p className="font-medium">{order.restaurants?.address}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide">
              Entregar
            </p>
            <p className="font-medium">{DRIVER_CLIENT_LOCATION_LABEL}</p>
          </div>
          {order.whatsapp && (
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                WhatsApp
              </p>
              <a
                href={`https://wa.me/${order.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand"
              >
                {order.whatsapp}
              </a>
            </div>
          )}
        </div>

        <div className="border-t border-border pt-3 space-y-1">
          {order.order_items?.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.quantity}× {item.name}
              </span>
            </div>
          ))}
        </div>

        {(order.status === "confirmed" || order.status === "in_progress") && (
          <Button
            className="w-full"
            size="lg"
            onClick={markPickedUp}
            loading={updating}
          >
            <Package className="size-5" />
            Recogí el pedido
          </Button>
        )}

        {order.status === "on_the_way" && (
          <Button
            className="w-full"
            size="lg"
            onClick={() => setConfirmDeliver(true)}
            disabled={updating}
          >
            <CheckCircle2 className="size-5" />
            Entregado
          </Button>
        )}
      </div>

      {confirmDeliver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-deliver-title"
        >
          <div className="w-full max-w-sm rounded-3xl bg-surface border border-border p-5 space-y-5 shadow-lg">
            <p
              id="confirm-deliver-title"
              className="font-display text-lg font-bold text-center leading-snug"
            >
              ¿Estás seguro/a que ya entregaste el pedido al cliente?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmDeliver(false)}
                disabled={updating}
              >
                No
              </Button>
              <Button
                className="flex-1"
                loading={updating}
                onClick={markDelivered}
              >
                Sí, seguro
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
