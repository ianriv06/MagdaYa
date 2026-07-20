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
import { formatCurrency, DELIVERY_FEE } from "@/lib/utils";
import {
  fileToCompressedDataUrl,
  formatCheckoutError,
  isBucketNotFoundError,
  isMissingColumnError,
} from "@/lib/receipt-upload";
import { QrCode, MapPin, CheckCircle2, MessageCircle, Upload, AlertTriangle } from "lucide-react";
import type { PaymentSettings, Restaurant } from "@/lib/types";

const DELIVERY_ADDRESS_PENDING =
  "Pendiente — el repartidor pedirá la ubicación por WhatsApp";

export default function CheckoutPage() {
  const {
    items,
    orderType,
    notes,
    setNotes,
    whatsapp,
    setWhatsapp,
    subtotal,
    clearCart,
    itemCount,
  } = useCart();
  const { user, profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [qr, setQr] = useState<PaymentSettings | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const deliveryFee = orderType === "delivery" ? DELIVERY_FEE : 0;
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

  // Prefill WhatsApp from profile phone once
  useEffect(() => {
    if (!whatsapp.trim() && profile?.phone) {
      setWhatsapp(profile.phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.phone]);

  const placeOrder = async () => {
    if (!user || !restaurant) return;
    const whatsappClean = whatsapp.trim();
    if (!whatsappClean) {
      setError("Ingresa tu número de WhatsApp para esta orden");
      return;
    }
    if (!receiptFile) {
      setError("Sube una captura de tu comprobante de pago");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const ext = receiptFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      let receiptUrl: string;

      const { error: uploadError } = await supabase.storage
        .from("payment-receipts")
        .upload(path, receiptFile);

      if (uploadError) {
        if (!isBucketNotFoundError(uploadError)) throw uploadError;
        // Storage bucket missing — store a compressed image on the order row
        receiptUrl = await fileToCompressedDataUrl(receiptFile);
      } else {
        const {
          data: { publicUrl },
        } = supabase.storage.from("payment-receipts").getPublicUrl(path);
        receiptUrl = publicUrl;
      }

      const orderPayload: Record<string, unknown> = {
        customer_id: user.id,
        restaurant_id: restaurant.id,
        order_type: orderType,
        status: "placed",
        subtotal: subtotal(),
        delivery_fee: deliveryFee,
        total,
        delivery_address:
          orderType === "delivery"
            ? DELIVERY_ADDRESS_PENDING
            : restaurant.address,
        delivery_lat: orderType === "delivery" ? null : restaurant.lat,
        delivery_lng: orderType === "delivery" ? null : restaurant.lng,
        customer_notes: notes || null,
        whatsapp: whatsappClean,
        payment_receipt_url: receiptUrl,
      };

      let { data: order, error: orderError } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select()
        .single();

      // Older DBs may be missing whatsapp / payment_receipt_url — retry without them
      if (
        orderError &&
        (isMissingColumnError(orderError, "whatsapp") ||
          isMissingColumnError(orderError, "payment_receipt_url"))
      ) {
        const {
          whatsapp: _w,
          payment_receipt_url: _r,
          ...basePayload
        } = orderPayload;
        const noteParts = [
          typeof basePayload.customer_notes === "string"
            ? basePayload.customer_notes
            : "",
          `WhatsApp: ${whatsappClean}`,
          "Comprobante adjunto (pendiente de migración de columnas)",
        ].filter(Boolean);
        const retry = await supabase
          .from("orders")
          .insert({
            ...basePayload,
            customer_notes: noteParts.join(" | "),
          })
          .select()
          .single();
        order = retry.data;
        orderError = retry.error;
      }

      if (orderError) throw orderError;
      if (!order) throw new Error("No se creó el pedido");

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
        note: "Pedido realizado, esperando confirmación",
      });

      clearCart();
      router.push(`/orders/${order.id}`);
    } catch (err: unknown) {
      console.error("Checkout error:", err);
      setError(formatCheckoutError(err));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-30 bg-white border-b border-border px-4 h-14 flex items-center">
        <h1 className="text-lg font-bold">Pagar</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6 animate-slide-up">
        {orderType === "delivery" && (
          <section
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 flex gap-3"
            role="status"
          >
            <AlertTriangle
              className="size-5 text-amber-600 shrink-0 mt-0.5"
              aria-hidden
            />
            <div className="space-y-1 min-w-0">
              <h2 className="font-bold text-[15px] text-amber-950 flex items-center gap-2">
                <MapPin className="size-4" /> Ubicación de entrega
              </h2>
              <p className="text-sm text-amber-900/90 leading-snug">
                Una vez que pagues tu orden y sea confirmada, tu delivery te
                escribirá por WhatsApp para pedirte tu ubicación.
              </p>
            </div>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="font-bold text-[15px] flex items-center gap-2">
            <MessageCircle className="size-4 text-brand" /> WhatsApp de contacto
          </h2>
          <Input
            id="whatsapp"
            label="Número de WhatsApp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Ej. 71234567"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            required
          />
          <p className="text-xs text-muted">
            El restaurante o el repartidor te escribirá por este número para
            confirmar y pedir tu ubicación.
          </p>
        </section>

        <section>
          <Textarea
            id="notes"
            label="Notas (opcional)"
            placeholder="Alergias, código del portón, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        <section className="rounded-xl bg-white border border-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <QrCode className="size-5 text-brand" />
            <h2 className="font-bold">Pagar con QR</h2>
          </div>
          <p className="text-sm text-muted">
            Escanea el código de abajo para pagar{" "}
            <strong className="text-ink">{formatCurrency(total)}</strong>. Es el
            único método de pago.
          </p>

          <div className="bg-subtle rounded-xl p-4 flex items-center justify-center min-h-[420px]">
            {qr?.qr_image_url ? (
              <div className="relative w-full max-w-[384px] aspect-square">
                <Image
                  src={qr.qr_image_url}
                  alt="Código QR de pago"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="text-center text-muted text-sm space-y-2">
                <QrCode className="size-16 mx-auto opacity-30" />
                <p>El código QR aún no está configurado.</p>
                <p className="text-xs">
                  El administrador debe subir el QR de pago.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold leading-snug">
              Ya pagué al código QR de arriba, aquí subiré captura de mi
              comprobante
            </p>
            <label className="relative block rounded-xl border border-dashed border-border bg-subtle overflow-hidden cursor-pointer hover:border-ink transition-colors">
              {receiptPreview ? (
                <div className="relative w-full aspect-[4/3]">
                  <Image
                    src={receiptPreview}
                    alt="Comprobante de pago"
                    fill
                    className="object-contain p-2"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-muted text-sm">
                  <Upload className="size-7 opacity-50" />
                  <span className="text-center font-medium text-ink">
                    Toca para subir captura
                  </span>
                  <span className="text-xs">JPG, PNG o captura de pantalla</span>
                </div>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setReceiptFile(file);
                    setReceiptPreview(URL.createObjectURL(file));
                  }
                }}
              />
            </label>
            {receiptFile && (
              <button
                type="button"
                className="text-xs text-muted font-medium underline"
                onClick={() => {
                  setReceiptFile(null);
                  setReceiptPreview("");
                }}
              >
                Quitar imagen
              </button>
            )}
          </div>
        </section>

        <div className="rounded-xl bg-white border border-border p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted">
              {items.reduce((s, i) => s + i.quantity, 0)} productos ·{" "}
              {orderType === "delivery" ? "Domicilio" : "Para recoger"}
            </span>
            <span>{formatCurrency(subtotal())}</span>
          </div>
          {orderType === "delivery" && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Costo de envío</span>
              <span>{formatCurrency(deliveryFee)}</span>
            </div>
          )}
          <div className="border-t border-border pt-2 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-brand">{formatCurrency(total)}</span>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 text-danger text-sm p-3">
            {error}
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={placeOrder}
          loading={loading}
          disabled={!receiptFile}
        >
          <CheckCircle2 className="size-5" />
          Hacer pedido
        </Button>
      </div>
    </div>
  );
}
