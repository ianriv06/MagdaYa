"use client";

import { RestaurantLayout } from "@/components/restaurant/restaurant-layout";
import { formatCurrency } from "@/lib/utils";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";
import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";

export default function RestaurantOverviewPage() {
  return (
    <RestaurantLayout title="Resumen">
      {(restaurant) => <Overview restaurantId={restaurant.id} />}
    </RestaurantLayout>
  );
}

function Overview({ restaurantId }: { restaurantId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuCount, setMenuCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const [{ data: o }, { count }] = await Promise.all([
        supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("restaurant_id", restaurantId)
          .in("status", [
            "confirmed",
            "in_progress",
            "on_the_way",
            "delivered",
            "cancelled",
          ])
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("menu_items")
          .select("*", { count: "exact", head: true })
          .eq("restaurant_id", restaurantId),
      ]);
      setOrders(o || []);
      setMenuCount(count || 0);
    };
    load();

    const channel = supabase
      .channel("rest-overview")
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

  const active = orders.filter(
    (o) => !["delivered", "cancelled"].includes(o.status)
  ).length;
  const revenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Pedidos activos", value: active },
          { label: "Platillos", value: menuCount },
          { label: "Ingresos recientes", value: formatCurrency(revenue) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-surface border border-border p-4"
          >
            <p className="text-xs text-muted font-medium">{stat.label}</p>
            <p className="font-display text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Pedidos recientes</h2>
          <Link
            href="/restaurant/orders"
            className="text-sm text-brand font-medium"
          >
            Ver todos
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-muted text-sm py-8 text-center">
            Aún no hay pedidos. ¡Comparte tu restaurante y empieza a vender!
          </p>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-surface border border-border"
              >
                <div>
                  <p className="font-semibold text-sm">
                    #{o.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs text-muted">
                    {formatCurrency(o.total)} ·{" "}
                    {o.order_type === "delivery" ? "Domicilio" : "Para recoger"}
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
