"use client";

import { useEffect, useState } from "react";
import {
  DriverLayout,
  DriverAvailabilityToggle,
} from "@/components/driver/driver-layout";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { Driver, Order } from "@/lib/types";
import { MapPin, Store } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const supabase = createClient();
  const router = useRouter();

  const load = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, restaurants(*), order_items(*)")
      .eq("status", "in_progress")
      .eq("order_type", "delivery")
      .is("driver_id", null)
      .order("created_at", { ascending: true });
    setOrders(data || []);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("driver-available")
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

  const accept = async (orderId: string) => {
    setLoadingId(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ driver_id: driver.id })
      .eq("id", orderId)
      .is("driver_id", null);

    if (!error) {
      router.push("/driver/active");
    }
    setLoadingId(null);
    await load();
  };

  const decline = (orderId: string) => {
    setOrders(orders.filter((o) => o.id !== orderId));
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {orders.length}{" "}
          {orders.length === 1 ? "solicitud" : "solicitudes"} cerca
        </p>
        <DriverAvailabilityToggle driver={driver} />
      </div>

      {!driver.is_available && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
          Estás desconectado. Conéctate para recibir entregas.
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="font-medium">No hay solicitudes</p>
          <p className="text-sm mt-1">
            Aparecerán aquí cuando estén listas para recoger.
          </p>
        </div>
      ) : (
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
                    {formatCurrency(order.total)} ·{" "}
                    {order.order_items?.reduce((s, i) => s + i.quantity, 0)}{" "}
                    productos
                  </p>
                </div>
                <span className="text-xs font-semibold bg-brand-light text-brand-dark px-2.5 py-1 rounded-full">
                  Nuevo
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Store className="size-4 text-danger mt-0.5 shrink-0" />
                  <span>{order.restaurants?.address}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="size-4 text-info mt-0.5 shrink-0" />
                  <span>{order.delivery_address}</span>
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
      )}
    </div>
  );
}
