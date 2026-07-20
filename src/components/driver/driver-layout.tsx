"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { cn } from "@/lib/utils";
import { Package, Navigation, Wallet } from "lucide-react";
import type { Driver } from "@/lib/types";
import {
  PaymentQrUploader,
  uploadPaymentQr,
} from "@/components/payments/payment-qr-uploader";
import { isMissingColumnError } from "@/lib/receipt-upload";

const nav = [
  {
    href: "/driver",
    label: "Disponibles",
    icon: <Package className="size-[26px]" />,
  },
  {
    href: "/driver/active",
    label: "Activo",
    icon: <Navigation className="size-[26px]" />,
  },
  {
    href: "/driver/pagos",
    label: "Pagos",
    icon: <Wallet className="size-[26px]" />,
  },
];

export function DriverLayout({
  title,
  children,
}: {
  title: string;
  children: (driver: Driver) => ReactNode;
}) {
  const { profile, loading, user, refreshProfile } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (loading) return;
    if (!user || profile?.role !== "driver") {
      router.replace("/auth");
      return;
    }

    const load = async () => {
      let { data } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data) {
        const { data: created } = await supabase
          .from("drivers")
          .insert({ user_id: user.id, is_available: true })
          .select()
          .single();
        data = created;
      }

      setDriver(data);
      setReady(true);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await supabase
            .from("drivers")
            .update({
              current_lat: pos.coords.latitude,
              current_lng: pos.coords.longitude,
            })
            .eq("user_id", user.id);
        });
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, loading]);

  if (loading || !ready || !driver) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-muted">
        Cargando…
      </div>
    );
  }

  if (!profile?.payment_qr_url) {
    return (
      <DashboardShell title="QR de cobro" nav={nav} roleLabel="Repartidor">
        <SetupDriverPaymentQr onSaved={() => refreshProfile()} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={title} nav={nav} roleLabel="Repartidor">
      {children(driver)}
    </DashboardShell>
  );
}

function SetupDriverPaymentQr({ onSaved }: { onSaved: () => void }) {
  const { user, refreshProfile } = useAuth();
  const supabase = createClient();
  const [qrPreview, setQrPreview] = useState("");
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!qrFile && !qrPreview) {
      setError("Sube la foto de tu QR de cobro");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const url = qrFile
        ? await uploadPaymentQr(user.id, qrFile)
        : qrPreview;
      const { error: qrErr } = await supabase
        .from("profiles")
        .update({ payment_qr_url: url })
        .eq("id", user.id);
      if (qrErr && isMissingColumnError(qrErr, "payment_qr_url")) {
        throw new Error(
          "Falta la columna payment_qr_url. Ejecuta supabase/pagos.sql en Supabase."
        );
      }
      if (qrErr) throw qrErr;
      await refreshProfile();
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md animate-slide-up">
      <h2 className="font-display text-xl font-bold mb-2">Tu QR de cobro</h2>
      <p className="text-muted text-sm mb-6">
        Para empezar a repartir, sube la foto del QR con el que quieres recibir
        tus pagos por entregas.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <PaymentQrUploader
          value={qrPreview}
          required
          onChange={(url, file) => {
            setQrPreview(url);
            setQrFile(file ?? null);
          }}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-2xl bg-brand text-white font-semibold disabled:opacity-50"
        >
          {loading ? "Guardando…" : "Guardar QR"}
        </button>
      </form>
    </div>
  );
}

export function DriverAvailabilityToggle({
  driver,
  onAvailabilityChange,
}: {
  driver: Driver;
  onAvailabilityChange?: () => void | Promise<void>;
}) {
  const [available, setAvailable] = useState(driver.is_available);
  const supabase = createClient();

  const toggle = async () => {
    const next = !available;
    setAvailable(next);
    await supabase
      .from("drivers")
      .update({ is_available: next })
      .eq("id", driver.id);

    if (next) {
      await supabase.rpc("refresh_delivery_offers");
      await onAvailabilityChange?.();
    }
  };

  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <span
        className={cn(
          "text-xs font-semibold min-w-[5.5rem] text-right",
          available ? "text-brand-dark" : "text-muted"
        )}
      >
        {available ? "En línea" : "Desconectado"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={available}
        aria-label={available ? "En línea" : "Desconectado"}
        onClick={toggle}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
          available ? "bg-brand" : "bg-border"
        )}
      >
        <span
          className={cn(
            "inline-block size-5 rounded-full bg-white shadow-sm transition-transform",
            available ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </label>
  );
}
