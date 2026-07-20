"use client";

import { useState } from "react";
import { RestaurantLayout } from "@/components/restaurant/restaurant-layout";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DeliveryEtaRange, Restaurant } from "@/lib/types";
import {
  DELIVERY_ETA_OPTIONS,
  normalizeDeliveryEtaRange,
} from "@/lib/utils";

export default function RestaurantSettingsPage() {
  return (
    <RestaurantLayout title="Configuración">
      {(restaurant) => <SettingsForm restaurant={restaurant} />}
    </RestaurantLayout>
  );
}

function SettingsForm({ restaurant }: { restaurant: Restaurant }) {
  const supabase = createClient();
  const [name, setName] = useState(restaurant.name);
  const [description, setDescription] = useState(restaurant.description || "");
  const [cuisine, setCuisine] = useState(restaurant.cuisine || "");
  const [address, setAddress] = useState(restaurant.address);
  const [deliveryEta, setDeliveryEta] = useState<DeliveryEtaRange>(
    normalizeDeliveryEtaRange(
      restaurant.delivery_eta_range,
      restaurant.eta_minutes
    )
  );
  const [isOpen, setIsOpen] = useState(restaurant.is_open);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    const { error: saveError } = await supabase
      .from("restaurants")
      .update({
        name,
        description,
        cuisine,
        address,
        delivery_eta_range: deliveryEta,
        is_open: isOpen,
      })
      .eq("id", restaurant.id);
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <form onSubmit={save} className="max-w-md space-y-4 animate-slide-up">
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
      <Input
        id="address"
        label="Dirección"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        required
      />
      <div className="space-y-1.5">
        <label htmlFor="delivery-eta" className="block text-sm font-medium text-ink">
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

      <label className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border cursor-pointer">
        <div>
          <p className="font-semibold text-sm">Abierto para pedidos</p>
          <p className="text-xs text-muted">
            Los clientes solo pueden pedir cuando estás abierto
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
