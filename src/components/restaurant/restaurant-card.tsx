"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, Heart } from "lucide-react";
import type { Restaurant } from "@/lib/types";
import { formatDeliveryEta, isRestaurantAcceptingOrders } from "@/lib/utils";

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const acceptingOrders = isRestaurantAcceptingOrders(restaurant);
  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="group block active:opacity-90 transition-opacity"
    >
      <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-subtle">
        {restaurant.cover_url || restaurant.image_url ? (
          <Image
            src={restaurant.cover_url || restaurant.image_url || ""}
            alt={restaurant.name}
            fill
            className="object-cover"
            sizes="(max-width:768px) 100vw, 33vw"
            unoptimized={(
              restaurant.cover_url ||
              restaurant.image_url ||
              ""
            ).startsWith("data:")}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand/15 to-subtle flex items-center justify-center">
            <span className="font-display text-4xl font-bold text-brand/30">
              {restaurant.name.charAt(0)}
            </span>
          </div>
        )}
        {!acceptingOrders && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
            <span className="text-white font-bold text-sm bg-black/70 px-3 py-1.5 rounded-full">
              Cerrado
            </span>
          </div>
        )}
        <button
          type="button"
          aria-label="Guardar"
          onClick={(e) => e.preventDefault()}
          className="absolute top-3 right-3 size-9 rounded-full bg-white/95 shadow-sm flex items-center justify-center active:scale-95"
        >
          <Heart className="size-4 text-ink" strokeWidth={2} />
        </button>
      </div>

      <div className="pt-2.5 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-[16px] leading-tight tracking-tight truncate">
            {restaurant.name}
          </h3>
          <div className="flex items-center gap-0.5 text-[13px] font-semibold shrink-0 bg-subtle rounded-full px-1.5 py-0.5">
            <Star className="size-3 fill-ink text-ink" />
            {Number(restaurant.rating).toFixed(1)}
          </div>
        </div>
        <p className="text-[13px] text-muted mt-0.5 truncate">
          <span className="text-brand font-bold">
            {formatDeliveryEta(
              restaurant.delivery_eta_range,
              restaurant.eta_minutes
            )}
          </span>
          {restaurant.cuisine ? (
            <span> · {restaurant.cuisine}</span>
          ) : null}
        </p>
      </div>
    </Link>
  );
}
