"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/store/cart";
import { CustomerNav, DesktopHeader } from "@/components/layout/customer-nav";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn, DELIVERY_FEE, PLATFORM_FEE } from "@/lib/utils";
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

  const deliveryFee = orderType === "delivery" ? DELIVERY_FEE : 0;
  const platformFee = PLATFORM_FEE;
  const total = subtotal() + deliveryFee + platformFee;

  if (itemCount() === 0) {
    return (
      <div className="min-h-dvh bg-white pb-[72px]">
        <DesktopHeader />
        <div className="flex flex-col items-center justify-center py-24 px-4">
          <div className="size-16 rounded-full bg-subtle flex items-center justify-center mb-4">
            <Store className="size-7 text-ink" />
          </div>
          <h1 className="text-xl font-bold">Tu carrito está vacío</h1>
          <p className="text-muted text-sm mt-1 mb-6">
            Agrega algo rico para empezar
          </p>
          <Link href="/">
            <Button>Ver restaurantes</Button>
          </Link>
        </div>
        <CustomerNav />
      </div>
    );
  }

  const restaurantName = items[0]?.restaurantName;

  return (
    <div className="min-h-dvh bg-white pb-[100px] md:pb-8">
      <DesktopHeader />
      <div className="max-w-lg mx-auto px-4 py-5 animate-slide-up">
        <h1 className="text-[22px] font-bold tracking-tight mb-0.5">Carrito</h1>
        <p className="text-muted text-[13px] mb-5">De {restaurantName}</p>

        <div className="inline-flex p-1 rounded-full bg-subtle mb-5 w-full">
          {(
            [
              { id: "delivery", label: "Domicilio", icon: Bike },
              { id: "pickup", label: "Para recoger", icon: Store },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setOrderType(id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 h-9 rounded-full text-[13px] font-bold transition-colors",
                orderType === id ? "bg-brand text-white" : "text-ink/70"
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="divide-y divide-border mb-5">
          {items.map((item) => (
            <div key={item.menuItem.id} className="flex gap-3 py-4">
              <div className="relative size-16 rounded-lg overflow-hidden bg-subtle shrink-0">
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
                  <h3 className="font-bold text-[15px] truncate">
                    {item.menuItem.name}
                  </h3>
                  <button
                    onClick={() => removeItem(item.menuItem.id)}
                    className="text-muted shrink-0 active:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <p className="font-bold text-[14px] mt-0.5">
                  {formatCurrency(Number(item.menuItem.price) * item.quantity)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() =>
                      updateQuantity(item.menuItem.id, item.quantity - 1)
                    }
                    className="size-7 rounded-full bg-subtle flex items-center justify-center"
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
                    className="size-7 rounded-full bg-ink text-white flex items-center justify-center"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 mb-6 text-[14px]">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span className="font-semibold">{formatCurrency(subtotal())}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">
              {orderType === "delivery" ? "Costo de envío" : "Para recoger"}
            </span>
            <span className="font-semibold">
              {orderType === "delivery"
                ? formatCurrency(deliveryFee)
                : "Gratis"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Tarifa de plataforma</span>
            <span className="font-semibold">{formatCurrency(platformFee)}</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between text-[16px] font-bold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
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
          Ir a pagar
        </Button>
      </div>
      <CustomerNav />
    </div>
  );
}
