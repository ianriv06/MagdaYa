"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { OrderTimeline } from "@/components/ui/order-timeline";
import { OrderMap, type MapMarker } from "@/components/map/order-map";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/utils";
import type { Order } from "@/lib/types";
import { ArrowLeft, Bike, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  const load = async () => {
    const { data } = await supabase
      .from("orders")
      .select(
        "*, restaurants(*), order_items(*), drivers(*, profiles:user_id(*))"
      )
      .eq("id", id)
      .single();
    setOrder(data);
    setLoading(false);
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`order-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `id=eq.${id}`,
        },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-muted">
        Loading order…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
        <p className="text-muted">Order not found</p>
        <Button variant="outline" onClick={() => router.push("/orders")}>
          Back to orders
        </Button>
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
      label: "Delivery location",
      type: "customer",
    });
  }
  if (
    order.drivers?.current_lat != null &&
    order.drivers?.current_lng != null &&
    (order.status === "on_the_way" || order.status === "in_progress")
  ) {
    markers.push({
      id: "driver",
      lat: order.drivers.current_lat,
      lng: order.drivers.current_lng,
      label: "Your driver",
      type: "driver",
    });
  }

  const showMap =
    order.order_type === "delivery" &&
    !["delivered", "cancelled"].includes(order.status);

  return (
    <div className="min-h-dvh bg-canvas pb-8">
      <header className="sticky top-0 z-30 bg-surface border-b border-border px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.push("/orders")} className="p-1">
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold truncate">
            {order.restaurants?.name}
          </h1>
        </div>
        <StatusBadge status={order.status} />
      </header>

      {showMap && markers.length > 0 && (
        <OrderMap markers={markers} className="h-56 md:h-72 rounded-none border-0 border-b" />
      )}

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6 animate-slide-up">
        <div className="flex items-center gap-2 text-sm text-muted">
          {order.order_type === "delivery" ? (
            <Bike className="size-4" />
          ) : (
            <Store className="size-4" />
          )}
          {order.order_type === "delivery" ? "Delivery" : "Pickup"}
          {order.delivery_address && (
            <span className="truncate">· {order.delivery_address}</span>
          )}
        </div>

        <section className="rounded-3xl bg-surface border border-border p-5">
          <h2 className="font-semibold mb-4">Order progress</h2>
          <OrderTimeline status={order.status} />
        </section>

        {order.status === "placed" && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
            We&apos;ve received your order. Waiting for payment confirmation
            from MagdaYa.
          </div>
        )}

        {order.drivers?.profiles && order.status === "on_the_way" && (
          <div className="rounded-2xl bg-brand-light p-4 text-sm">
            <p className="font-semibold text-brand-dark">
              {order.drivers.profiles.full_name} is on the way
            </p>
          </div>
        )}

        <section className="rounded-3xl bg-surface border border-border p-5">
          <h2 className="font-semibold mb-3">Items</h2>
          <div className="space-y-2">
            {order.order_items?.map((item) => (
              <div
                key={item.id}
                className="flex justify-between text-sm gap-2"
              >
                <span>
                  <span className="font-semibold text-brand">
                    {item.quantity}×
                  </span>{" "}
                  {item.name}
                </span>
                <span className="text-muted shrink-0">
                  {formatCurrency(Number(item.price) * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-border mt-3 pt-3 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-brand">{formatCurrency(order.total)}</span>
          </div>
        </section>

        {user && (
          <p className="text-center text-xs text-muted">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </p>
        )}
      </div>
    </div>
  );
}
