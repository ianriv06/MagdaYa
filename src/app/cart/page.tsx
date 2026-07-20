"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/store/cart";
import { CustomerNav, DesktopHeader } from "@/components/layout/customer-nav";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { Minus, Plus, Trash2, Bike, Store } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

export default function CartPage() {
  const {
    items,
    orderType,
    setOrderType,
    updateQuantity,
    removeItem,
    subtotal,
    itemCount,
  } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const deliveryFee = orderType === "delivery" ? 2.99 : 0;
  const total = subtotal() + deliveryFee;

  if (itemCount() === 0) {
    return (
      <div className="min-h-dvh pb-20">
        <DesktopHeader />
        <div className="flex flex-col items-center justify-center py-24 px-4">
          <div className="size-20 rounded-full bg-brand-light flex items-center justify-center mb-4">
            <Store className="size-8 text-brand" />
          </div>
          <h1 className="font-display text-xl font-bold">Your cart is empty</h1>
          <p className="text-muted text-sm mt-1 mb-6">
            Add something delicious to get started
          </p>
          <Link href="/">
            <Button>Browse restaurants</Button>
          </Link>
        </div>
        <CustomerNav />
      </div>
    );
  }

  const restaurantName = items[0]?.restaurantName;

  return (
    <div className="min-h-dvh pb-28 md:pb-8">
      <DesktopHeader />
      <div className="max-w-lg mx-auto px-4 py-6 animate-slide-up">
        <h1 className="font-display text-2xl font-bold mb-1">Cart</h1>
        <p className="text-muted text-sm mb-6">From {restaurantName}</p>

        <div className="flex gap-2 mb-6 p-1 bg-canvas rounded-2xl border border-border">
          {(
            [
              { id: "delivery", label: "Delivery", icon: Bike },
              { id: "pickup", label: "Pickup", icon: Store },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setOrderType(id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold transition-all",
                orderType === id
                  ? "bg-surface text-ink shadow-sm"
                  : "text-muted"
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3 mb-6">
          {items.map((item) => (
            <div
              key={item.menuItem.id}
              className="flex gap-3 p-3 rounded-2xl bg-surface border border-border"
            >
              <div className="relative size-16 rounded-xl overflow-hidden bg-canvas shrink-0">
                {item.menuItem.image_url && (
                  <Image
                    src={item.menuItem.image_url}
                    alt={item.menuItem.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2">
                  <h3 className="font-semibold text-sm truncate">
                    {item.menuItem.name}
                  </h3>
                  <button
                    onClick={() => removeItem(item.menuItem.id)}
                    className="text-muted hover:text-danger shrink-0"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <p className="text-brand font-bold text-sm mt-0.5">
                  {formatCurrency(Number(item.menuItem.price) * item.quantity)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() =>
                      updateQuantity(item.menuItem.id, item.quantity - 1)
                    }
                    className="size-7 rounded-full bg-canvas border border-border flex items-center justify-center"
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="text-sm font-bold w-4 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(item.menuItem.id, item.quantity + 1)
                    }
                    className="size-7 rounded-full bg-brand text-white flex items-center justify-center"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-surface border border-border p-4 space-y-2 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span>{formatCurrency(subtotal())}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">
              {orderType === "delivery" ? "Delivery fee" : "Pickup"}
            </span>
            <span>
              {orderType === "delivery"
                ? formatCurrency(deliveryFee)
                : "Free"}
            </span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-brand">{formatCurrency(total)}</span>
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={() => {
            if (!user) {
              router.push("/auth?next=/checkout");
              return;
            }
            router.push("/checkout");
          }}
        >
          Continue to checkout
        </Button>
      </div>
      <CustomerNav />
    </div>
  );
}
