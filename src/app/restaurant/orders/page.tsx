"use client";

import { useEffect, useState } from "react";
import { RestaurantLayout } from "@/components/restaurant/restaurant-layout";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/utils";
import type { Order } from "@/lib/types";
import { OrderTimeline } from "@/components/ui/order-timeline";

export default function RestaurantOrdersPage() {
  return (
    <RestaurantLayout title="Orders">
      {(restaurant) => <OrdersList restaurantId={restaurant.id} />}
    </RestaurantLayout>
  );
}

function OrdersList({ restaurantId }: { restaurantId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*), profiles:customer_id(*)")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });
    setOrders(data || []);
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

  const selectedOrder = orders.find((o) => o.id === selected);

  return (
    <div className="space-y-3 animate-slide-up">
      {orders.length === 0 ? (
        <p className="text-center text-muted py-12 text-sm">No orders yet</p>
      ) : (
        orders.map((o) => (
          <button
            key={o.id}
            onClick={() => setSelected(selected === o.id ? null : o.id)}
            className="w-full text-left p-4 rounded-2xl bg-surface border border-border hover:border-brand/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  #{o.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {o.profiles?.full_name} ·{" "}
                  {o.order_type === "delivery" ? "Delivery" : "Pickup"} ·{" "}
                  {formatCurrency(o.total)}
                </p>
                <p className="text-xs text-muted">
                  {new Date(o.created_at).toLocaleString()}
                </p>
              </div>
              <StatusBadge status={o.status} />
            </div>

            {selected === o.id && selectedOrder && (
              <div className="mt-4 pt-4 border-t border-border space-y-4" onClick={(e) => e.stopPropagation()}>
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
          </button>
        ))
      )}
    </div>
  );
}
