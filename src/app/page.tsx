"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Restaurant } from "@/lib/types";
import { RestaurantCard } from "@/components/restaurant/restaurant-card";
import { CustomerNav, DesktopHeader } from "@/components/layout/customer-nav";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";
import { MapPin, Search } from "lucide-react";

export default function HomePage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { orderType, setOrderType, deliveryAddress } = useCart();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .eq("is_open", true)
        .order("rating", { ascending: false });
      // Show all listed restaurants; cards mark schedule-closed with "Cerrado"
      setRestaurants(data || []);
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      (r.cuisine || "").toLowerCase().includes(query.toLowerCase())
  );

  const locationLabel =
    deliveryAddress?.trim() ||
    (orderType === "pickup" ? "Recoger cerca" : "Tu ubicación");

  return (
    <div className="min-h-dvh bg-white pb-[72px] desktop-no-mobile-nav-pad">
      <DesktopHeader />

      {/* Mobile sticky header — Uber Eats style */}
      <header className="sticky top-0 z-40 bg-white safe-top mobile-only-chrome md:hidden border-b border-transparent">
        <div className="px-4 pt-3 pb-3 space-y-3">
          {/* Delivery / Pickup segmented control */}
          <div className="flex justify-center">
            <div className="inline-flex p-1.5 rounded-full bg-subtle">
              {(
                [
                  { id: "delivery", label: "Domicilio" },
                  { id: "pickup", label: "Para recoger" },
                ] as const
              ).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setOrderType(id)}
                  className={cn(
                    "h-[37px] px-[18px] rounded-full text-[15px] font-bold transition-colors",
                    orderType === id
                      ? "bg-brand text-white"
                      : "text-ink/70"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <button
            type="button"
            className="flex items-center justify-center gap-1 w-full text-[14px] font-semibold active:opacity-70"
          >
            <MapPin className="size-3.5 shrink-0" strokeWidth={2.5} />
            <span className="truncate max-w-[70%]">
              Ahora · {locationLabel}
            </span>
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-[18px] text-ink" />
            <input
              type="search"
              placeholder="Comida, restaurantes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-full bg-subtle text-[15px] placeholder:text-muted focus:outline-none"
            />
          </div>
        </div>
      </header>

      {/* Desktop search (supplement) */}
      <div className="hidden md:block max-w-6xl mx-auto px-4 pt-6">
        <div className="flex gap-2 mb-4">
          {(
            [
              { id: "delivery", label: "Domicilio" },
              { id: "pickup", label: "Para recoger" },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setOrderType(id)}
              className={cn(
                "h-[41px] px-[18px] rounded-full text-[16px] font-bold transition-colors",
                orderType === id ? "bg-brand text-white" : "bg-subtle text-ink"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative max-w-md mb-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted" />
          <input
            type="search"
            placeholder="Comida, restaurantes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-full bg-subtle text-ink placeholder:text-muted focus:outline-none"
          />
        </div>
      </div>

      <main className="pt-4 md:pt-6 pb-4">
        <div className="max-w-6xl mx-auto px-4 mb-3">
          <h2 className="text-[18px] font-bold tracking-tight">
            {query ? "Resultados" : "Restaurantes cerca"}
          </h2>
        </div>

        {loading ? (
          <div>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn("w-full", i % 2 === 0 && "bg-brand-light")}
              >
                <div className="max-w-6xl mx-auto px-4 py-4 animate-pulse">
                  <div className="aspect-[16/9] rounded-xl bg-subtle" />
                  <div className="pt-2.5 space-y-2">
                    <div className="h-4 bg-subtle rounded w-2/3" />
                    <div className="h-3 bg-subtle rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="max-w-6xl mx-auto px-4 text-center py-20 text-muted">
            <p className="font-semibold text-ink">No se encontraron restaurantes</p>
            <p className="text-sm mt-1">
              {restaurants.length === 0
                ? "Los restaurantes aparecerán cuando se unan a MagdaYa."
                : "Intenta con otra búsqueda."}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((r, i) => (
              <div
                key={r.id}
                style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                className={cn(
                  "w-full animate-slide-up",
                  i % 2 === 0 && "bg-brand-light"
                )}
              >
                <div className="max-w-6xl mx-auto px-4 py-4">
                  <RestaurantCard restaurant={r} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <CustomerNav />
    </div>
  );
}
