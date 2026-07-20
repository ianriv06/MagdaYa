"use client";

import { useState } from "react";
import { RestaurantLayout } from "@/components/restaurant/restaurant-layout";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DeliveryEtaRange, OpeningHours, Restaurant } from "@/lib/types";
import {
  DELIVERY_ETA_OPTIONS,
  deliveryEtaToMinutes,
  normalizeDeliveryEtaRange,
  normalizeOpeningHours,
  validateOpeningHours,
} from "@/lib/utils";
import {
  fileToCompressedDataUrl,
  formatCheckoutError,
  isBucketNotFoundError,
  isMissingColumnError,
} from "@/lib/receipt-upload";
import {
  LocationPicker,
  type PickedLocation,
} from "@/components/map/location-picker";
import { OpeningHoursEditor } from "@/components/restaurant/opening-hours-editor";
import {
  PaymentQrUploader,
  uploadPaymentQr,
} from "@/components/payments/payment-qr-uploader";
import { Upload } from "lucide-react";

export default function RestaurantSettingsPage() {
  return (
    <RestaurantLayout title="Configuración">
      {(restaurant) => <SettingsForm restaurant={restaurant} />}
    </RestaurantLayout>
  );
}

function SettingsForm({ restaurant }: { restaurant: Restaurant }) {
  const { profile, user, refreshProfile } = useAuth();
  const supabase = createClient();
  const [name, setName] = useState(restaurant.name);
  const [description, setDescription] = useState(restaurant.description || "");
  const [cuisine, setCuisine] = useState(restaurant.cuisine || "");
  const [location, setLocation] = useState<PickedLocation>({
    lat: restaurant.lat,
    lng: restaurant.lng,
    address: restaurant.address,
  });
  const [deliveryEta, setDeliveryEta] = useState<DeliveryEtaRange>(
    normalizeDeliveryEtaRange(
      restaurant.delivery_eta_range,
      restaurant.eta_minutes
    )
  );
  const [openingHours, setOpeningHours] = useState<OpeningHours>(() =>
    normalizeOpeningHours(restaurant.opening_hours)
  );
  const [isOpen, setIsOpen] = useState(restaurant.is_open);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(
    restaurant.cover_url || restaurant.image_url || ""
  );
  const [qrPreview, setQrPreview] = useState(profile?.payment_qr_url || "");
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const uploadListingImage = async (file: File) => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${restaurant.id}/listing-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("restaurant-images")
      .upload(path, file, { upsert: true });

    if (upErr) {
      if (!isBucketNotFoundError(upErr)) throw upErr;
      return fileToCompressedDataUrl(file, 1200, 0.78);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("restaurant-images").getPublicUrl(path);
    return publicUrl;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const hoursError = validateOpeningHours(openingHours);
    if (hoursError) {
      setError(hoursError);
      return;
    }
    if (!qrPreview && !qrFile) {
      setError("Tu QR de cobro es obligatorio");
      return;
    }

    setSaving(true);

    try {
      if (user && (qrFile || qrPreview !== profile?.payment_qr_url)) {
        const paymentQrUrl = qrFile
          ? await uploadPaymentQr(user.id, qrFile)
          : qrPreview;
        const { error: qrErr } = await supabase
          .from("profiles")
          .update({ payment_qr_url: paymentQrUrl })
          .eq("id", user.id);
        if (qrErr && isMissingColumnError(qrErr, "payment_qr_url")) {
          throw new Error(
            "Falta la columna payment_qr_url. Ejecuta supabase/pagos.sql en Supabase."
          );
        }
        if (qrErr) throw qrErr;
        setQrPreview(paymentQrUrl);
        setQrFile(null);
        await refreshProfile();
      }

      const payload: Record<string, unknown> = {
        name,
        description,
        cuisine,
        address: location.address,
        lat: location.lat,
        lng: location.lng,
        delivery_eta_range: deliveryEta,
        eta_minutes: deliveryEtaToMinutes(deliveryEta),
        opening_hours: openingHours,
        is_open: isOpen,
      };

      if (imageFile) {
        const url = await uploadListingImage(imageFile);
        // Listing cards use cover_url || image_url — keep both in sync
        payload.cover_url = url;
        payload.image_url = url;
        setImagePreview(url);
        setImageFile(null);
      } else if (
        !imagePreview &&
        (restaurant.cover_url || restaurant.image_url)
      ) {
        payload.cover_url = null;
        payload.image_url = null;
      }

      let { error: saveError } = await supabase
        .from("restaurants")
        .update(payload)
        .eq("id", restaurant.id);

      // Older DBs may not have delivery_eta_range — retry with eta_minutes only
      if (saveError && isMissingColumnError(saveError, "delivery_eta_range")) {
        const { delivery_eta_range: _range, ...withoutRange } = payload;
        const retry = await supabase
          .from("restaurants")
          .update(withoutRange)
          .eq("id", restaurant.id);
        saveError = retry.error;
      }

      if (saveError && isMissingColumnError(saveError, "opening_hours")) {
        const { opening_hours: _hours, ...withoutHours } = payload;
        const retry = await supabase
          .from("restaurants")
          .update(withoutHours)
          .eq("id", restaurant.id);
        saveError = retry.error;
        if (!saveError) {
          throw new Error(
            "Falta la columna opening_hours. Ejecuta supabase/restaurant-opening-hours.sql en Supabase."
          );
        }
      }

      if (saveError) throw saveError;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      setError(formatCheckoutError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="max-w-md space-y-4 animate-slide-up">
      <div className="space-y-2">
        <p className="block text-sm font-semibold text-ink">
          Imagen del listado
        </p>
        <p className="text-xs text-muted">
          Se muestra en la página de inicio y en la ficha de tu restaurante.
        </p>
        <label className="relative block aspect-[16/9] rounded-xl border border-dashed border-border bg-subtle overflow-hidden cursor-pointer hover:border-ink transition-colors">
          {imagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagePreview}
              alt="Imagen del listado"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted text-sm">
              <Upload className="size-7 opacity-50" />
              <span className="font-medium text-ink">Toca para subir imagen</span>
              <span className="text-xs">JPG, PNG o WebP</span>
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setImageFile(file);
              setImagePreview(URL.createObjectURL(file));
            }}
          />
        </label>
        {imagePreview && (
          <button
            type="button"
            className="text-xs text-muted font-medium underline"
            onClick={() => {
              setImageFile(null);
              setImagePreview("");
            }}
          >
            Quitar imagen
          </button>
        )}
      </div>

      <Input
        id="name"
        label="Nombre del restaurante"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Input
        id="cuisine"
        label="Tipo de comida"
        value={cuisine}
        onChange={(e) => setCuisine(e.target.value)}
      />
      <div className="space-y-1.5">
        <p className="block text-sm font-semibold text-ink">
          Ubicación en el mapa
        </p>
        <p className="text-xs text-muted">
          Los clientes ven esta dirección y el mapa después de pedir.
        </p>
        <LocationPicker value={location} onChange={setLocation} />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="delivery-eta"
          className="block text-sm font-medium text-ink"
        >
          Tiempo de entrega (min)
        </label>
        <select
          id="delivery-eta"
          className="w-full h-12 px-4 rounded-2xl border-2 border-border bg-surface focus:outline-none focus:border-brand"
          value={deliveryEta}
          onChange={(e) => setDeliveryEta(e.target.value as DeliveryEtaRange)}
          required
        >
          {DELIVERY_ETA_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted">
          Se muestra en tu listado para los clientes.
        </p>
      </div>
      <Textarea
        id="description"
        label="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <OpeningHoursEditor value={openingHours} onChange={setOpeningHours} />

      <PaymentQrUploader
        value={qrPreview}
        required
        onChange={(url, file) => {
          setQrPreview(url);
          setQrFile(file ?? null);
        }}
      />

      <label className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border cursor-pointer">
        <div>
          <p className="font-semibold text-sm">Abierto para pedidos</p>
          <p className="text-xs text-muted">
            Desactívalo para cerrar temporalmente, aunque estés en horario
          </p>
        </div>
        <input
          type="checkbox"
          checked={isOpen}
          onChange={(e) => setIsOpen(e.target.checked)}
          className="size-5 accent-[var(--brand)]"
        />
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" className="w-full" loading={saving}>
        {saved ? "¡Guardado!" : "Guardar cambios"}
      </Button>
    </form>
  );
}
