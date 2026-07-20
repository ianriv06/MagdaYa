"use client";

import { useCallback, useEffect, useState } from "react";
import { RestaurantLayout } from "@/components/restaurant/restaurant-layout";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { formatCurrency, getRestaurantEarnings } from "@/lib/utils";
import type { Order, PaymentRequest, Restaurant } from "@/lib/types";
import {
  PAYMENT_REQUEST_STATUS_LABELS,
  requestOrderPayment,
} from "@/lib/payment-requests";
import { Wallet } from "lucide-react";

export default function RestaurantPagosPage() {
  return (
    <RestaurantLayout title="Pagos">
      {(restaurant) => <RestaurantPagos restaurant={restaurant} />}
    </RestaurantLayout>
  );
}

function RestaurantPagos({ restaurant }: { restaurant: Restaurant }) {
  const { profile, user } = useAuth();
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [ordersRes, reqRes] = await Promise.all([
      supabase
        .from("orders")
        .select("*, order_items(*), profiles:customer_id(*)")
        .eq("restaurant_id", restaurant.id)
        .not("restaurant_ready_at", "is", null)
        .order("restaurant_ready_at", { ascending: false }),
      supabase
        .from("payment_requests")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .eq("payee_type", "restaurant"),
    ]);
    setOrders(ordersRes.data || []);
    setRequests(reqRes.data || []);
  }, [restaurant.id, supabase]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`rest-pagos-${restaurant.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_requests" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, restaurant.id, supabase]);

  const requestByOrder = new Map(requests.map((r) => [r.order_id, r]));

  const pedirPago = async (order: Order) => {
    if (!user) return;
    if (!profile?.payment_qr_url) {
      setError("Sube tu QR de cobro en Configuración antes de pedir pago");
      return;
    }
    setLoadingId(order.id);
    setError("");
    const { error: reqError } = await requestOrderPayment({
      orderId: order.id,
      payeeType: "restaurant",
      payeeUserId: user.id,
      amount: getRestaurantEarnings(order),
      qrImageUrl: profile.payment_qr_url,
      restaurantId: restaurant.id,
    });
    if (reqError) {
      setError(reqError.message);
      setLoadingId(null);
      return;
    }
    await load();
    setLoadingId(null);
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <p className="text-sm text-muted">
        Órdenes listas para cobrar. Pide el pago y el admin lo verá en su pestaña
        Pagos.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}

      {orders.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <Wallet className="size-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Sin pagos pendientes</p>
          <p className="text-sm mt-1">
            Marca pedidos como “Orden lista para recoger” para verlos aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const req = requestByOrder.get(order.id);
            const amount = getRestaurantEarnings(order);
            return (
              <div
                key={order.id}
                className="rounded-2xl bg-surface border border-border p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {order.profiles?.full_name || "Cliente"}
                    </p>
                    <p className="text-sm text-muted">
                      #{order.id.slice(0, 8).toUpperCase()} ·{" "}
                      {order.order_type === "delivery"
                        ? "Domicilio"
                        : "Para recoger"}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      Lista{" "}
                      {order.restaurant_ready_at
                        ? new Date(order.restaurant_ready_at).toLocaleString(
                            "es-MX"
                          )
                        : ""}
                    </p>
                  </div>
                  <p className="font-display font-bold text-lg text-brand">
                    {formatCurrency(amount)}
                  </p>
                </div>

                {req ? (
                  <p
                    className={`text-sm font-semibold ${
                      req.status === "paid"
                        ? "text-brand"
                        : req.status === "rejected"
                          ? "text-danger"
                          : "text-ink"
                    }`}
                  >
                    {PAYMENT_REQUEST_STATUS_LABELS[req.status]}
                  </p>
                ) : (
                  <Button
                    className="w-full"
                    loading={loadingId === order.id}
                    onClick={() => pedirPago(order)}
                  >
                    Pedir pago
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
