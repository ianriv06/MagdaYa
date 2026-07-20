"use client";

import Image from "next/image";
import { Plus, Minus } from "lucide-react";
import type { MenuItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";

export function MenuItemCard({
  item,
  restaurantId,
  restaurantName,
}: {
  item: MenuItem;
  restaurantId: string;
  restaurantName: string;
}) {
  const { items, addItem, updateQuantity } = useCart();
  const inCart = items.find((i) => i.menuItem.id === item.id);

  return (
    <div
      className={cn(
        "flex gap-3 p-3 rounded-2xl bg-surface border border-border",
        !item.is_available && "opacity-50"
      )}
    >
      <div className="relative size-24 shrink-0 rounded-xl overflow-hidden bg-canvas">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand/10 to-transparent" />
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <h4 className="font-semibold leading-tight">{item.name}</h4>
        {item.description && (
          <p className="text-xs text-muted mt-0.5 line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-bold text-brand">
            {formatCurrency(item.price)}
          </span>
          {!item.is_available ? (
            <span className="text-xs text-muted font-medium">Unavailable</span>
          ) : inCart ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.id, inCart.quantity - 1)}
                className="size-8 rounded-full bg-canvas border border-border flex items-center justify-center active:scale-95"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="text-sm font-bold w-4 text-center">
                {inCart.quantity}
              </span>
              <button
                onClick={() => updateQuantity(item.id, inCart.quantity + 1)}
                className="size-8 rounded-full bg-brand text-white flex items-center justify-center active:scale-95"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addItem(item, restaurantId, restaurantName)}
              className="size-9 rounded-full bg-brand text-white flex items-center justify-center active:scale-95 shadow-sm shadow-brand/30"
            >
              <Plus className="size-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
