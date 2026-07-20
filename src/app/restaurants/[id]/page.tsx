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
import { formatCurrency, formatDeliveryEta, isRestaurantAcceptingOrders } from "@/lib/utils";
import { ArrowLeft, Star } from "lucide-react";
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
      <div className="min-h-dvh flex items-center justify-center text-muted bg-white">
        Cargando…
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-white">
        <p className="text-muted">Restaurante no encontrado</p>
        <Link href="/" className="text-brand font-bold">
          Ir al inicio
        </Link>
      </div>
    );
  }

  const uncategorized = items.filter((i) => !i.category_id);
  const grouped = categories.map((c) => ({
    category: c,
    items: items.filter((i) => i.category_id === c.id),
  }));
  const acceptingOrders = isRestaurantAcceptingOrders(restaurant);

  return (
    <div className="min-h-dvh bg-white pb-[88px] desktop-no-mobile-nav-pad">
      <div className="relative h-[200px] md:h-64 bg-subtle">
        {restaurant.cover_url || restaurant.image_url ? (
          <Image
            src={restaurant.cover_url || restaurant.image_url || ""}
            alt={restaurant.name}
            fill
            className="object-cover"
            priority
            unoptimized={(
              restaurant.cover_url ||
              restaurant.image_url ||
              ""
            ).startsWith("data:")}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand/30 to-subtle" />
        )}
        <button
          onClick={() => router.back()}
          className="absolute top-3 left-3 size-10 rounded-full bg-white shadow-md flex items-center justify-center active:scale-95"
        >
          <ArrowLeft className="size-5" strokeWidth={2.25} />
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-0">
        <div className="pt-4 pb-3 border-b border-border">
          <h1 className="text-[22px] md:text-3xl font-bold tracking-tight leading-tight">
            {restaurant.name}
          </h1>
          <p className="text-[13px] text-muted mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1 font-semibold text-ink">
              <Star className="size-3 fill-ink text-ink" />
              {Number(restaurant.rating).toFixed(1)}
            </span>
            <span>·</span>
            <span>
              {formatDeliveryEta(
                restaurant.delivery_eta_range,
                restaurant.eta_minutes
              )}
            </span>
            {restaurant.cuisine && (
              <>
                <span>·</span>
                <span>{restaurant.cuisine}</span>
              </>
            )}
            <span>·</span>
            <span
              className={
                acceptingOrders
                  ? "font-semibold text-brand"
                  : "font-semibold text-danger"
              }
            >
              {acceptingOrders ? "Abierto" : "Cerrado"}
            </span>
          </p>
          {restaurant.description && (
            <p className="text-[13px] text-muted mt-2 leading-relaxed">
              {restaurant.description}
            </p>
          )}
          {!acceptingOrders && (
            <p className="mt-3 text-sm font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Este restaurante está cerrado ahora. Vuelve en su horario de
              atención.
            </p>
          )}
        </div>

        <div className="py-2 space-y-6">
          {grouped.map(
            ({ category, items: catItems }) =>
              catItems.length > 0 && (
                <section key={category.id}>
                  <h2 className="text-[18px] font-bold tracking-tight pt-3 pb-1">
                    {category.name}
                  </h2>
                  <div>
                    {catItems.map((item) => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        restaurantId={restaurant.id}
                        restaurantName={restaurant.name}
                        orderingDisabled={!acceptingOrders}
                      />
                    ))}
                  </div>
                </section>
              )
          )}

          {uncategorized.length > 0 && (
            <section>
              <h2 className="text-[18px] font-bold tracking-tight pt-3 pb-1">
                Menú
              </h2>
              <div>
                {uncategorized.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    restaurantId={restaurant.id}
                    restaurantName={restaurant.name}
                    orderingDisabled={!acceptingOrders}
                  />
                ))}
              </div>
            </section>
          )}

          {items.length === 0 && (
            <p className="text-center text-muted py-12 text-sm">
              Aún no hay productos en el menú. ¡Vuelve pronto!
            </p>
          )}
        </div>
      </div>

      {itemCount > 0 && (
        <div className="fixed bottom-[64px] md:bottom-6 inset-x-0 z-40 px-4 safe-bottom">
          <div className="max-w-md mx-auto">
            <Button
              className="w-full shadow-lg"
              size="lg"
              onClick={() => router.push("/cart")}
            >
              Ver carrito · {itemCount} · {formatCurrency(cartSubtotal)}
            </Button>
          </div>
        </div>
      )}

      <CustomerNav />
    </div>
  );
}
