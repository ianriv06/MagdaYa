"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  Settings,
} from "lucide-react";
import { DEFAULT_DELIVERY_ETA } from "@/lib/utils";
import type { Restaurant } from "@/lib/types";

const nav = [
  {
    href: "/restaurant",
    label: "Resumen",
    icon: <LayoutDashboard className="size-6" />,
  },
  {
    href: "/restaurant/menu",
    label: "Menú",
    icon: <UtensilsCrossed className="size-6" />,
  },
  {
    href: "/restaurant/orders",
    label: "Pedidos",
    icon: <ClipboardList className="size-6" />,
  },
  {
    href: "/restaurant/settings",
    label: "Configuración",
    icon: <Settings className="size-6" />,
  },
];

export function RestaurantLayout({
  title,
  children,
}: {
  title: string;
  children: (restaurant: Restaurant) => ReactNode;
}) {
  const { profile, loading, user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (loading) return;
    if (!user || profile?.role !== "restaurant") {
      router.replace("/auth");
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();
      setRestaurant(data);
      setReady(true);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, loading]);

  if (loading || !ready) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-muted">
        Cargando…
      </div>
    );
  }

  if (!restaurant) {
    return (
      <DashboardShell title="Configura tu restaurante" nav={nav} roleLabel="Restaurante">
        <SetupRestaurant
          onCreated={(r) => {
            setRestaurant(r);
          }}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={title} nav={nav} roleLabel="Restaurante">
      {children(restaurant)}
    </DashboardShell>
  );
}

function SetupRestaurant({
  onCreated,
}: {
  onCreated: (r: Restaurant) => void;
}) {
  const { user } = useAuth();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError("");

    const payload = {
      owner_id: user.id,
      name,
      address,
      cuisine,
      description,
      delivery_eta_range: DEFAULT_DELIVERY_ETA,
      eta_minutes: 25,
      lat: 40.7128 + Math.random() * 0.05,
      lng: -74.006 + Math.random() * 0.05,
      image_url: `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80`,
      cover_url: `https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80`,
    };

    let { data, error: err } = await supabase
      .from("restaurants")
      .insert(payload)
      .select()
      .single();

    if (
      err &&
      typeof err.message === "string" &&
      err.message.toLowerCase().includes("delivery_eta_range")
    ) {
      const { delivery_eta_range: _r, ...withoutRange } = payload;
      const retry = await supabase
        .from("restaurants")
        .insert(withoutRange)
        .select()
        .single();
      data = retry.data;
      err = retry.error;
    }

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    if (!data) {
      setError("No se pudo crear el restaurante");
      setLoading(false);
      return;
    }
    onCreated(data);
  };

  return (
    <div className="max-w-md animate-slide-up">
      <h2 className="font-display text-xl font-bold mb-2">
        Configura tu restaurante
      </h2>
      <p className="text-muted text-sm mb-6">
        Cuéntanos sobre tu local para empezar a recibir pedidos.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Nombre del restaurante</label>
          <input
            className="w-full h-12 px-4 rounded-2xl border-2 border-border bg-surface focus:outline-none focus:border-brand"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Tipo de comida</label>
          <input
            className="w-full h-12 px-4 rounded-2xl border-2 border-border bg-surface focus:outline-none focus:border-brand"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            placeholder="Italiana, mexicana, hamburguesas…"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Dirección</label>
          <input
            className="w-full h-12 px-4 rounded-2xl border-2 border-border bg-surface focus:outline-none focus:border-brand"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Descripción</label>
          <textarea
            className="w-full min-h-24 px-4 py-3 rounded-2xl border-2 border-border bg-surface focus:outline-none focus:border-brand resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {error && (
          <p className="text-sm text-danger">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-2xl bg-brand text-white font-semibold disabled:opacity-50"
        >
          {loading ? "Creando…" : "Crear restaurante"}
        </button>
      </form>
    </div>
  );
}
