"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/store/cart";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { QrCode, MapPin, CheckCircle2 } from "lucide-react";
import type { PaymentSettings, Restaurant } from "@/lib/types";

export default function CheckoutPage() {
  const {
    items,
    orderType,
    deliveryAddress,
    setDeliveryAddress,
    notes,
    setNotes,
    subtotal,
    clearCart,
    itemCount,
    deliveryLat,
    deliveryLng,
  } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [qr, setQr] = useState<PaymentSettings | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);

  const deliveryFee = orderType === "delivery" ? 2.99 : 0;
  const total = subtotal() + deliveryFee;

  useEffect(() => {
    if (itemCount() === 0) {
      router.replace("/cart");
      return;
    }

    const load = async () => {
      const [{ data: payment }, { data: rest }] = await Promise.all([
        supabase.from("payment_settings").select("*").limit(1).single(),
        supabase
          .from("restaurants")
          .select("*")
          .eq("id", items[0].restaurantId)
          .single(),
      ]);
      setQr(payment);
      setRestaurant(rest);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          setDeliveryAddress(
            data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
            latitude,
            longitude
          );
        } catch {
          setDeliveryAddress(
            `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
            latitude,
            longitude
          );
        }
        setLocating(false);
      },
      () => {
        setError("Could not get your location");
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const placeOrder = async () => {
    if (!user || !restaurant) return;
    if (orderType === "delivery" && !deliveryAddress.trim()) {
      setError("Please enter a delivery address");
      return;
    }
    if (!paid) {
      setError("Please confirm you've paid via QR before placing your order");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let lat = deliveryLat;
      let lng = deliveryLng;

      if (orderType === "delivery" && (lat == null || lng == null)) {
        // Default near restaurant if no coords
        lat = restaurant.lat + 0.008;
        lng = restaurant.lng + 0.008;
      }

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          restaurant_id: restaurant.id,
          order_type: orderType,
          status: "placed",
          subtotal: subtotal(),
          delivery_fee: deliveryFee,
          total,
          delivery_address:
            orderType === "delivery" ? deliveryAddress : restaurant.address,
          delivery_lat: orderType === "delivery" ? lat : restaurant.lat,
          delivery_lng: orderType === "delivery" ? lng : restaurant.lng,
          customer_notes: notes || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map((i) => ({
        order_id: order.id,
        menu_item_id: i.menuItem.id,
        name: i.menuItem.name,
        price: i.menuItem.price,
        quantity: i.quantity,
        image_url: i.menuItem.image_url,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);
      if (itemsError) throw itemsError;

      await supabase.from("order_status_history").insert({
        order_id: order.id,
        status: "placed",
        changed_by: user.id,
        note: "Order placed, awaiting payment confirmation",
      });

      clearCart();
      router.push(`/orders/${order.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to place order");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-30 bg-surface border-b border-border px-4 h-14 flex items-center">
        <h1 className="font-display text-lg font-bold">Checkout</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6 animate-slide-up">
        {orderType === "delivery" && (
          <section className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <MapPin className="size-4 text-brand" /> Delivery address
            </h2>
            <Input
              id="address"
              placeholder="Enter your address"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={useMyLocation}
              loading={locating}
              type="button"
            >
              Use my location
            </Button>
          </section>
        )}

        <section>
          <Textarea
            id="notes"
            label="Notes (optional)"
            placeholder="Allergies, gate code, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        <section className="rounded-3xl bg-surface border border-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <QrCode className="size-5 text-brand" />
            <h2 className="font-semibold">Pay with QR</h2>
          </div>
          <p className="text-sm text-muted">
            Scan the code below to pay{" "}
            <strong className="text-ink">{formatCurrency(total)}</strong>. This
            is the only payment method.
          </p>

          <div className="bg-canvas rounded-2xl p-6 flex items-center justify-center min-h-[220px]">
            {qr?.qr_image_url ? (
              <div className="relative w-48 h-48">
                <Image
                  src={qr.qr_image_url}
                  alt="Payment QR code"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="text-center text-muted text-sm space-y-2">
                <QrCode className="size-16 mx-auto opacity-30" />
                <p>QR code not configured yet.</p>
                <p className="text-xs">
                  Admin needs to upload the payment QR.
                </p>
              </div>
            )}
          </div>

          <label className="flex items-start gap-3 p-3 rounded-2xl border-2 border-border cursor-pointer hover:border-brand transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand-light">
            <input
              type="checkbox"
              checked={paid}
              onChange={(e) => setPaid(e.target.checked)}
              className="mt-0.5 size-5 accent-[var(--brand)]"
            />
            <span className="text-sm">
              <strong>I have paid</strong> via the QR code above
            </span>
          </label>
        </section>

        <div className="rounded-2xl bg-surface border border-border p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted">
              {items.reduce((s, i) => s + i.quantity, 0)} items ·{" "}
              {orderType === "delivery" ? "Delivery" : "Pickup"}
            </span>
            <span>{formatCurrency(subtotal())}</span>
          </div>
          {orderType === "delivery" && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Delivery fee</span>
              <span>{formatCurrency(deliveryFee)}</span>
            </div>
          )}
          <div className="border-t border-border pt-2 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-brand">{formatCurrency(total)}</span>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 text-danger text-sm p-3">
            {error}
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={placeOrder}
          loading={loading}
          disabled={!paid}
        >
          <CheckCircle2 className="size-5" />
          Place order
        </Button>
      </div>
    </div>
  );
}
