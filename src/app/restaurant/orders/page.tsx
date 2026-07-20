"use client";

import { useEffect, useState } from "react";
import { RestaurantLayout } from "@/components/restaurant/restaurant-layout";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { Order } from "@/lib/types";
import { OrderTimeline } from "@/components/ui/order-timeline";
import { isMissingColumnError } from "@/lib/receipt-upload";

export default function RestaurantOrdersPage() {
  return (
    <RestaurantLayout title="Pedidos">
      {(restaurant) => <OrdersList restaurantId={restaurant.id} />}
    </RestaurantLayout>
  );
}

function OrdersList({ restaurantId }: { restaurantId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");
  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*), profiles:customer_id(*)")
      .eq("restaurant_id", restaurantId)
      .in("status", ["confirmed", "in_progress", "on_the_way"])
      .order("created_at", { ascending: false });

    // Pedidos: still cooking / not yet marked ready for Pagos
    const active = (data || []).filter((o) => !o.restaurant_ready_at);
    setOrders(active);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("rest-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const markReady = async (orderId: string) => {
    setUpdating(orderId);
    setError("");
    const { error: updateError } = await supabase
      .from("orders")
      .update({ restaurant_ready_at: new Date().toISOString() })
      .eq("id", orderId);

    if (updateError && isMissingColumnError(updateError, "restaurant_ready_at")) {
      setError(
        "Falta la columna restaurant_ready_at. Ejecuta supabase/pagos.sql en Supabase."
      );
      setUpdating(null);
      return;
    }
    if (updateError) {
      setError(updateError.message);
      setUpdating(null);
      return;
    }
    setSelected(null);
    await load();
    setUpdating(null);
  };

  const selectedOrder = orders.find((o) => o.id === selected);

  return (
    <div className="space-y-3 animate-slide-up">
      {error && <p className="text-sm text-danger">{error}</p>}
      {orders.length === 0 ? (
        <p className="text-center text-muted py-12 text-sm">
          No hay pedidos activos. Los listos para cobrar están en Pagos.
        </p>
      ) : (
        orders.map((o) => (
          <div
            key={o.id}
            className="w-full text-left p-4 rounded-2xl bg-surface border border-border"
          >
            <button
              type="button"
              onClick={() => setSelected(selected === o.id ? null : o.id)}
              className="w-full text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-base leading-tight">
                    {o.profiles?.full_name || "Cliente"}
                  </p>
                  <p className="text-sm text-muted mt-0.5">
                    #{o.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {o.order_type === "delivery" ? "Domicilio" : "Para recoger"}{" "}
                    · {formatCurrency(o.total)}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(o.created_at).toLocaleString("es-MX")}
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </div>
            </button>

            <div className="mt-3">
              <Button
                className="w-full"
                loading={updating === o.id}
                onClick={() => markReady(o.id)}
              >
                Orden lista para recoger
              </Button>
            </div>

            {selected === o.id && selectedOrder && (
              <div className="mt-4 pt-4 border-t border-border space-y-4">
                {selectedOrder.whatsapp && (
                  <p className="text-sm">
                    <span className="text-muted">WhatsApp: </span>
                    <a
                      href={`https://wa.me/${selectedOrder.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand"
                    >
                      {selectedOrder.whatsapp}
                    </a>
                  </p>
                )}
                <div className="space-y-1">
                  {selectedOrder.order_items?.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}× {item.name}
                      </span>
                      <span className="text-muted">
                        {formatCurrency(Number(item.price) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <OrderTimeline status={selectedOrder.status} />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
