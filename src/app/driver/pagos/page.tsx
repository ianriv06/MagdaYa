"use client";

import { useCallback, useEffect, useState } from "react";
import { DriverLayout } from "@/components/driver/driver-layout";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { formatCurrency, getDriverEarnings } from "@/lib/utils";
import type { Driver, Order, PaymentRequest } from "@/lib/types";
import {
  PAYMENT_REQUEST_STATUS_LABELS,
  requestOrderPayment,
} from "@/lib/payment-requests";
import { Wallet } from "lucide-react";

export default function DriverPagosPage() {
  return (
    <DriverLayout title="Pagos">
      {(driver) => <DriverPagos driver={driver} />}
    </DriverLayout>
  );
}

function DriverPagos({ driver }: { driver: Driver }) {
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
        .select("*, restaurants(*), order_items(*), profiles:customer_id(*)")
        .eq("driver_id", driver.id)
        .eq("status", "delivered")
        .order("created_at", { ascending: false }),
      supabase
        .from("payment_requests")
        .select("*")
        .eq("driver_id", driver.id)
        .eq("payee_type", "driver"),
    ]);
    setOrders(ordersRes.data || []);
    setRequests(reqRes.data || []);
  }, [driver.id, supabase]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`driver-pagos-${driver.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
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
  }, [driver.id, load, supabase]);

  const requestByOrder = new Map(requests.map((r) => [r.order_id, r]));

  const pedirPago = async (order: Order) => {
    if (!user) return;
    if (!profile?.payment_qr_url) {
      setError("Sube tu QR de cobro antes de pedir pago");
      return;
    }
    setLoadingId(order.id);
    setError("");
    const { error: reqError } = await requestOrderPayment({
      orderId: order.id,
      payeeType: "driver",
      payeeUserId: user.id,
      amount: getDriverEarnings(order),
      qrImageUrl: profile.payment_qr_url,
      driverId: driver.id,
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
        Entregas completadas. Pide el pago y el admin lo verá en Pagos.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}

      {orders.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <Wallet className="size-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Sin entregas completadas</p>
          <p className="text-sm mt-1">
            Cuando marques un pedido como entregado, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const req = requestByOrder.get(order.id);
            const amount = getDriverEarnings(order);
            return (
              <div
                key={order.id}
                className="rounded-2xl bg-surface border border-border p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {order.restaurants?.name || "Restaurante"}
                    </p>
                    <p className="text-sm text-muted">
                      {order.profiles?.full_name || "Cliente"} · #
                      {order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {new Date(order.created_at).toLocaleString("es-MX")}
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
