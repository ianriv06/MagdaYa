"use client";

import { useState } from "react";
import { RestaurantLayout } from "@/components/restaurant/restaurant-layout";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Restaurant } from "@/lib/types";

export default function RestaurantSettingsPage() {
  return (
    <RestaurantLayout title="Settings">
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
  const [isOpen, setIsOpen] = useState(restaurant.is_open);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase
      .from("restaurants")
      .update({
        name,
        description,
        cuisine,
        address,
        is_open: isOpen,
      })
      .eq("id", restaurant.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <form onSubmit={save} className="max-w-md space-y-4 animate-slide-up">
      <Input
        id="name"
        label="Restaurant name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Input
        id="cuisine"
        label="Cuisine"
        value={cuisine}
        onChange={(e) => setCuisine(e.target.value)}
      />
      <Input
        id="address"
        label="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        required
      />
      <Textarea
        id="description"
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <label className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border cursor-pointer">
        <div>
          <p className="font-semibold text-sm">Open for orders</p>
          <p className="text-xs text-muted">
            Customers can only order when you&apos;re open
          </p>
        </div>
        <input
          type="checkbox"
          checked={isOpen}
          onChange={(e) => setIsOpen(e.target.checked)}
          className="size-5 accent-[var(--brand)]"
        />
      </label>

      <Button type="submit" className="w-full" loading={saving}>
        {saved ? "Saved!" : "Save changes"}
      </Button>
    </form>
  );
}
