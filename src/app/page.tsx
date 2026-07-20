"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Restaurant } from "@/lib/types";
import { RestaurantCard } from "@/components/restaurant/restaurant-card";
import { CustomerNav, DesktopHeader } from "@/components/layout/customer-nav";
import { Search } from "lucide-react";

export default function HomePage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .eq("is_open", true)
        .order("rating", { ascending: false });
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

  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <DesktopHeader />

      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--brand)_0%,_transparent_55%)] opacity-40" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAgNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative max-w-6xl mx-auto px-4 py-10 md:py-16">
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight max-w-lg animate-slide-up">
            Magda<span className="text-brand">Ya</span>
          </h1>
          <p className="mt-2 text-white/70 text-base md:text-lg max-w-md animate-slide-up [animation-delay:80ms]">
            Your favorites, delivered or ready for pickup.
          </p>
          <div className="mt-6 relative max-w-md animate-slide-up [animation-delay:120ms]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted" />
            <input
              type="search"
              placeholder="Search restaurants or cuisines"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="font-display text-xl font-bold mb-4">
          {query ? "Results" : "Nearby restaurants"}
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-3xl bg-surface border border-border overflow-hidden animate-pulse"
              >
                <div className="aspect-[16/10] bg-canvas" />
                <div className="p-4 space-y-2">
                  <div className="h-5 bg-canvas rounded w-2/3" />
                  <div className="h-3 bg-canvas rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <p className="font-medium">No restaurants found</p>
            <p className="text-sm mt-1">
              {restaurants.length === 0
                ? "Restaurants will appear once they join MagdaYa."
                : "Try a different search."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r, i) => (
              <div
                key={r.id}
                style={{ animationDelay: `${i * 40}ms` }}
                className="animate-slide-up"
              >
                <RestaurantCard restaurant={r} />
              </div>
            ))}
          </div>
        )}
      </section>

      <CustomerNav />
    </div>
  );
}
