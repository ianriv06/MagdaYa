"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { CustomerNav, DesktopHeader } from "@/components/layout/customer-nav";
import { MobileLogoBar } from "@/components/layout/app-logo";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/utils";
import type { Order } from "@/lib/types";
import { ChevronRight } from "lucide-react";

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, restaurants(*), order_items(*)")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });
      setOrders(data || []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("customer-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `customer_id=eq.${user.id}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  return (
    <div className="min-h-dvh pb-20">
      <DesktopHeader />
      <MobileLogoBar />
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="font-display text-2xl font-bold mb-6">Tus pedidos</h1>

        {loading || authLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-surface border border-border animate-pulse"
              />
            ))}
          </div>
        ) : !user ? (
          <div className="text-center py-16">
            <p className="text-muted mb-4">Inicia sesión para ver tus pedidos</p>
            <Link
              href="/auth?next=/orders"
              className="text-brand font-semibold"
            >
              Iniciar sesión
            </Link>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <p className="font-medium">Aún no tienes pedidos</p>
            <Link href="/" className="text-brand text-sm font-semibold mt-2 inline-block">
              Empezar a pedir
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center gap-3 p-4 rounded-2xl bg-surface border border-border hover:border-brand/40 transition-colors animate-slide-up"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">
                      {order.restaurants?.name || "Restaurante"}
                    </h3>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-muted">
                    {formatCurrency(order.total)} ·{" "}
                    {order.order_type === "delivery" ? "Domicilio" : "Para recoger"} ·{" "}
                    {new Date(order.created_at).toLocaleDateString("es-MX")}
                  </p>
                </div>
                <ChevronRight className="size-5 text-muted shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
      <CustomerNav />
    </div>
  );
}
