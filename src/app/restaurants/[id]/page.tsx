"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Restaurant, MenuItem, MenuCategory } from "@/lib/types";
import { MenuItemCard } from "@/components/restaurant/menu-item-card";
import { CustomerNav } from "@/components/layout/customer-nav";
import { useCart } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Star, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const itemCount = useCart((s) => s.itemCount());
  const cartSubtotal = useCart((s) => s.subtotal());
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const [rRes, cRes, iRes] = await Promise.all([
        supabase.from("restaurants").select("*").eq("id", id).single(),
        supabase
          .from("menu_categories")
          .select("*")
          .eq("restaurant_id", id)
          .order("sort_order"),
        supabase
          .from("menu_items")
          .select("*")
          .eq("restaurant_id", id)
          .order("name"),
      ]);
      setRestaurant(rRes.data);
      setCategories(cRes.data || []);
      setItems(iRes.data || []);
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-muted">
        Loading…
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
        <p className="text-muted">Restaurant not found</p>
        <Link href="/" className="text-brand font-semibold">
          Go home
        </Link>
      </div>
    );
  }

  const uncategorized = items.filter((i) => !i.category_id);
  const grouped = categories.map((c) => ({
    category: c,
    items: items.filter((i) => i.category_id === c.id),
  }));

  return (
    <div className="min-h-dvh pb-28 md:pb-8">
      <div className="relative h-48 md:h-64 bg-ink">
        {restaurant.cover_url || restaurant.image_url ? (
          <Image
            src={restaurant.cover_url || restaurant.image_url || ""}
            alt={restaurant.name}
            fill
            className="object-cover opacity-80"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand/40 to-ink" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 size-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h1 className="font-display text-2xl md:text-3xl font-bold">
            {restaurant.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-white/80">
            <span className="flex items-center gap-1">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              {Number(restaurant.rating).toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {restaurant.eta_minutes} min
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {restaurant.cuisine || "Restaurant"}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {restaurant.description && (
          <p className="text-muted text-sm">{restaurant.description}</p>
        )}

        {grouped.map(
          ({ category, items: catItems }) =>
            catItems.length > 0 && (
              <section key={category.id}>
                <h2 className="font-display text-lg font-bold mb-3">
                  {category.name}
                </h2>
                <div className="space-y-3">
                  {catItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      restaurantId={restaurant.id}
                      restaurantName={restaurant.name}
                    />
                  ))}
                </div>
              </section>
            )
        )}

        {uncategorized.length > 0 && (
          <section>
            <h2 className="font-display text-lg font-bold mb-3">Menu</h2>
            <div className="space-y-3">
              {uncategorized.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  restaurantId={restaurant.id}
                  restaurantName={restaurant.name}
                />
              ))}
            </div>
          </section>
        )}

        {items.length === 0 && (
          <p className="text-center text-muted py-12">
            No menu items yet. Check back soon!
          </p>
        )}
      </div>

      {itemCount > 0 && (
        <div className="fixed bottom-20 md:bottom-6 inset-x-0 z-40 px-4 safe-bottom">
          <div className="max-w-md mx-auto">
            <Button
              className="w-full shadow-lg shadow-brand/30"
              size="lg"
              onClick={() => router.push("/cart")}
            >
              View cart · {itemCount} · {formatCurrency(cartSubtotal)}
            </Button>
          </div>
        </div>
      )}

      <CustomerNav />
    </div>
  );
}
