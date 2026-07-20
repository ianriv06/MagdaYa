"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { OrderTimeline } from "@/components/ui/order-timeline";
import { formatCurrency, ORDER_STATUS_LABELS } from "@/lib/utils";
import type { Order, OrderStatus } from "@/lib/types";
import { Check, DollarSign } from "lucide-react";

export default function AdminOrdersPage() {
  return (
    <AdminLayout title="Todos los pedidos">
      <AdminOrders />
    </AdminLayout>
  );
}

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const { user } = useAuth();
  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase
      .from("orders")
      .select(
        "*, restaurants(*), order_items(*), profiles:customer_id(*)"
      )
      .order("created_at", { ascending: false });
    setOrders(data || []);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    setUpdating(orderId);
    // confirmed auto-moves to in_progress via DB trigger
    await supabase.from("orders").update({ status }).eq("id", orderId);
    await load();
    setUpdating(null);
  };

  const filtered =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const counts = {
    placed: orders.filter((o) => o.status === "placed").length,
    money_paid: orders.filter((o) => o.status === "money_paid").length,
    active: orders.filter((o) =>
      ["confirmed", "in_progress", "on_the_way"].includes(o.status)
    ).length,
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Esperando pago", value: counts.placed },
          { label: "Por confirmar", value: counts.money_paid },
          { label: "En curso", value: counts.active },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl bg-surface border border-border p-4"
          >
            <p className="text-xs text-muted font-medium">{s.label}</p>
            <p className="font-display text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {(
          [
            "all",
            "placed",
            "money_paid",
            "in_progress",
            "on_the_way",
            "delivered",
          ] as const
        ).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filter === f
                ? "bg-ink text-white border-ink"
                : "bg-surface text-muted border-border"
            }`}
          >
            {f === "all" ? "Todos" : ORDER_STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center text-muted py-12 text-sm">Aún no hay pedidos</p>
        ) : (
          filtered.map((order) => (
            <div
              key={order.id}
              className="rounded-3xl bg-surface border border-border p-5 space-y-4"
            >
              <button
                className="w-full text-left"
                onClick={() =>
                  setSelected(selected === order.id ? null : order.id)
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      #{order.id.slice(0, 8).toUpperCase()} ·{" "}
                      {order.restaurants?.name}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {order.profiles?.full_name} ·{" "}
                      {formatCurrency(order.total)} ·{" "}
                      {order.order_type === "delivery"
                        ? "Domicilio"
                        : "Para recoger"}{" "}
                      · {new Date(order.created_at).toLocaleString("es-MX")}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              </button>

              {/* Manual admin actions */}
              {order.status === "placed" && (
                <Button
                  className="w-full"
                  onClick={() => updateStatus(order.id, "money_paid")}
                  loading={updating === order.id}
                >
                  <DollarSign className="size-4" />
                  Marcar pago recibido por el comercio
                </Button>
              )}

              {order.status === "money_paid" && (
                <Button
                  className="w-full"
                  onClick={() => updateStatus(order.id, "confirmed")}
                  loading={updating === order.id}
                >
                  <Check className="size-4" />
                  Confirmar pedido
                </Button>
              )}

              {order.status === "confirmed" && (
                <p className="text-xs text-muted text-center">
                  Pasó automáticamente a En preparación — repartidores notificados
                </p>
              )}

              {selected === order.id && (
                <div className="pt-3 border-t border-border space-y-4">
                  <div className="space-y-1">
                    {order.order_items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between text-sm"
                      >
                        <span>
                          {item.quantity}× {item.name}
                        </span>
                        <span className="text-muted">
                          {formatCurrency(Number(item.price) * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {order.delivery_address && (
                    <p className="text-sm text-muted">
                      Dirección: {order.delivery_address}
                    </p>
                  )}
                  {order.whatsapp && (
                    <p className="text-sm">
                      <span className="text-muted">WhatsApp: </span>
                      <a
                        href={`https://wa.me/${order.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-brand"
                      >
                        {order.whatsapp}
                      </a>
                    </p>
                  )}
                  {order.payment_receipt_url && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted">Comprobante de pago</p>
                      <a
                        href={order.payment_receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative block w-full max-w-xs aspect-[4/3] rounded-xl overflow-hidden border border-border bg-subtle"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={order.payment_receipt_url}
                          alt="Comprobante"
                          className="w-full h-full object-contain"
                        />
                      </a>
                    </div>
                  )}
                  <OrderTimeline status={order.status} />

                  {/* Manual override for admin */}
                  {user &&
                    !["delivered", "cancelled", "placed", "money_paid"].includes(
                      order.status
                    ) && (
                      <div className="flex flex-wrap gap-2">
                        {order.status === "in_progress" &&
                          order.order_type === "pickup" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateStatus(order.id, "delivered")
                              }
                            >
                              Marcar recogido / entregado
                            </Button>
                          )}
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() =>
                            updateStatus(order.id, "cancelled")
                          }
                        >
                          Cancelar pedido
                        </Button>
                      </div>
                    )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
