"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Bike, Package, Navigation } from "lucide-react";
import type { Driver } from "@/lib/types";

const nav = [
  {
    href: "/driver",
    label: "Disponibles",
    icon: <Package className="size-6" />,
  },
  {
    href: "/driver/active",
    label: "Activo",
    icon: <Navigation className="size-6" />,
  },
];

export function DriverLayout({
  title,
  children,
}: {
  title: string;
  children: (driver: Driver) => ReactNode;
}) {
  const { profile, loading, user } = useAuth();
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

      // Update location periodically
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

  return (
    <DashboardShell title={title} nav={nav} roleLabel="Repartidor">
      {children(driver)}
    </DashboardShell>
  );
}

export function DriverAvailabilityToggle({ driver }: { driver: Driver }) {
  const [available, setAvailable] = useState(driver.is_available);
  const supabase = createClient();

  const toggle = async () => {
    const next = !available;
    setAvailable(next);
    await supabase
      .from("drivers")
      .update({ is_available: next })
      .eq("id", driver.id);
  };

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
        available
          ? "bg-brand-light text-brand-dark"
          : "bg-canvas text-muted border border-border"
      }`}
    >
      <Bike className="size-3.5" />
      {available ? "En línea" : "Desconectado"}
    </button>
  );
}
