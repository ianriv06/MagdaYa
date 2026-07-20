"use client";

import Image from "next/image";
import { Plus, Minus } from "lucide-react";
import type { MenuItem } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";
import { useCart } from "@/store/cart";

export function MenuItemCard({
  item,
  restaurantId,
  restaurantName,
  orderingDisabled = false,
}: {
  item: MenuItem;
  restaurantId: string;
  restaurantName: string;
  orderingDisabled?: boolean;
}) {
  const { items, addItem, updateQuantity } = useCart();
  const inCart = items.find((i) => i.menuItem.id === item.id);
  const canOrder = item.is_available && !orderingDisabled;

  return (
    <div
      className={cn(
        "flex gap-3 py-4 border-b border-border last:border-0",
        !canOrder && "opacity-45"
      )}
    >
      <div className="flex-1 min-w-0 flex flex-col pr-1">
        <h4 className="font-bold text-[15px] leading-snug">{item.name}</h4>
        {item.description && (
          <p className="text-[13px] text-muted mt-1 line-clamp-2 leading-snug">
            {item.description}
          </p>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <span className="font-bold text-[15px]">
            {formatCurrency(item.price)}
          </span>
          {!item.is_available ? (
            <span className="text-xs text-muted font-medium">No disponible</span>
          ) : orderingDisabled ? (
            <span className="text-xs text-muted font-medium">Cerrado</span>
          ) : inCart ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.id, inCart.quantity - 1)}
                className="size-8 rounded-full bg-subtle flex items-center justify-center active:scale-95"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="text-sm font-bold w-4 text-center">
                {inCart.quantity}
              </span>
              <button
                onClick={() => updateQuantity(item.id, inCart.quantity + 1)}
                className="size-8 rounded-full bg-ink text-white flex items-center justify-center active:scale-95"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addItem(item, restaurantId, restaurantName)}
              className="size-8 rounded-full bg-white border border-border shadow-sm flex items-center justify-center active:scale-95"
            >
              <Plus className="size-4" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
      <div className="relative size-[96px] shrink-0 rounded-lg overflow-hidden bg-subtle">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : null}
      </div>
    </div>
  );
}
