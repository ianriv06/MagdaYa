"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, Clock } from "lucide-react";
import type { Restaurant } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="group block animate-slide-up bg-surface rounded-3xl overflow-hidden border border-border hover:shadow-lg hover:shadow-black/5 transition-all active:scale-[0.99]"
    >
      <div className="relative aspect-[16/10] bg-canvas overflow-hidden">
        {restaurant.cover_url || restaurant.image_url ? (
          <Image
            src={restaurant.cover_url || restaurant.image_url || ""}
            alt={restaurant.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width:768px) 100vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand/20 to-brand/5 flex items-center justify-center">
            <span className="font-display text-4xl font-bold text-brand/40">
              {restaurant.name.charAt(0)}
            </span>
          </div>
        )}
        {!restaurant.is_open && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold text-sm bg-black/60 px-3 py-1.5 rounded-full">
              Closed
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-bold text-lg leading-tight">
            {restaurant.name}
          </h3>
          <div className="flex items-center gap-1 text-sm font-semibold shrink-0">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            {Number(restaurant.rating).toFixed(1)}
          </div>
        </div>
        <p className="text-sm text-muted mt-0.5 truncate">
          {restaurant.cuisine || "Restaurant"}
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {restaurant.eta_minutes} min
          </span>
          <span>{formatCurrency(restaurant.delivery_fee)} delivery</span>
        </div>
      </div>
    </Link>
  );
}
