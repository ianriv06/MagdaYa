"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AdminLayout } from "@/components/admin/admin-layout";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { PaymentRequest } from "@/lib/types";
import { PAYMENT_REQUEST_STATUS_LABELS } from "@/lib/payment-requests";
import { Wallet } from "lucide-react";

export default function AdminPagosPage() {
  return (
    <AdminLayout title="Pagos">
      <AdminPagos />
    </AdminLayout>
  );
}

function AdminPagos() {
  const { user } = useAuth();
  const supabase = createClient();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [filter, setFilter] = useState<"pending" | "paid" | "all">("pending");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("payment_requests")
      .select(
        "*, orders(*, order_items(*)), restaurants(*), profiles:payee_user_id(*)"
      )
      .order("created_at", { ascending: false });
    setRequests((data as PaymentRequest[]) || []);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-pagos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_requests" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolve = async (id: string, status: "paid" | "rejected") => {
    setUpdating(id);
    await supabase
      .from("payment_requests")
      .update({
        status,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
      })
      .eq("id", id);
    await load();
    setUpdating(null);
  };

  const filtered =
    filter === "all"
      ? requests
      : requests.filter((r) => r.status === filter);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {pendingCount}{" "}
          {pendingCount === 1 ? "solicitud pendiente" : "solicitudes pendientes"}
        </p>
        <div className="flex gap-1 p-1 rounded-full bg-subtle">
          {(
            [
              { id: "pending", label: "Pendientes" },
              { id: "paid", label: "Pagados" },
              { id: "all", label: "Todos" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`h-8 px-3 rounded-full text-xs font-bold transition-colors ${
                filter === tab.id
                  ? "bg-brand text-white"
                  : "text-ink/70 hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <Wallet className="size-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No hay solicitudes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div
              key={req.id}
              className="rounded-2xl bg-surface border border-border p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                    {req.payee_type === "restaurant"
                      ? "Restaurante"
                      : "Repartidor"}
                  </p>
                  <p className="font-semibold text-lg leading-tight">
                    {req.profiles?.full_name || "Usuario"}
                  </p>
                  {req.restaurants?.name && (
                    <p className="text-sm text-muted">{req.restaurants.name}</p>
                  )}
                  <p className="text-xs text-muted mt-1">
                    Pedido #{req.order_id.slice(0, 8).toUpperCase()} ·{" "}
                    {new Date(req.created_at).toLocaleString("es-MX")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-bold text-xl text-brand">
                    {formatCurrency(req.amount)}
                  </p>
                  <p className="text-xs font-semibold mt-1">
                    {PAYMENT_REQUEST_STATUS_LABELS[req.status]}
                  </p>
                </div>
              </div>

              {req.qr_image_url && (
                <div className="relative w-full max-w-[200px] aspect-square rounded-xl border border-border bg-white overflow-hidden">
                  <Image
                    src={req.qr_image_url}
                    alt="QR de cobro"
                    fill
                    className="object-contain p-2"
                    unoptimized={req.qr_image_url.startsWith("data:")}
                  />
                </div>
              )}

              {req.orders?.order_items && req.orders.order_items.length > 0 && (
                <div className="text-sm space-y-1 border-t border-border pt-3">
                  {req.orders.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-2">
                      <span>
                        {item.quantity}× {item.name}
                      </span>
                      <span className="text-muted">
                        {formatCurrency(Number(item.price) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {req.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    loading={updating === req.id}
                    onClick={() => resolve(req.id, "rejected")}
                  >
                    Rechazar
                  </Button>
                  <Button
                    className="flex-1"
                    loading={updating === req.id}
                    onClick={() => resolve(req.id, "paid")}
                  >
                    Marcar pagado
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
