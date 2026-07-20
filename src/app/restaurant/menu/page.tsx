"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { RestaurantLayout } from "@/components/restaurant/restaurant-layout";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import type { MenuItem, MenuCategory } from "@/lib/types";
import { Plus, X, ToggleLeft, ToggleRight, Upload } from "lucide-react";

export default function RestaurantMenuPage() {
  return (
    <RestaurantLayout title="Menu">
      {(restaurant) => <MenuManager restaurantId={restaurant.id} />}
    </RestaurantLayout>
  );
}

function MenuManager({ restaurantId }: { restaurantId: string }) {
  const supabase = createClient();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const [{ data: i }, { data: c }] = await Promise.all([
      supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name"),
      supabase
        .from("menu_categories")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("sort_order"),
    ]);
    setItems(i || []);
    setCategories(c || []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    const { data } = await supabase
      .from("menu_categories")
      .insert({
        restaurant_id: restaurantId,
        name: newCategory.trim(),
        sort_order: categories.length,
      })
      .select()
      .single();
    if (data) {
      setCategories([...categories, data]);
      setCategoryId(data.id);
      setNewCategory("");
    }
  };

  const uploadImage = async (file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${restaurantId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("menu-images")
      .upload(path, file);
    if (upErr) throw upErr;
    const {
      data: { publicUrl },
    } = supabase.storage.from("menu-images").getPublicUrl(path);
    return publicUrl;
  };

  const createItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let image_url: string | null = null;
      if (imageFile) {
        image_url = await uploadImage(imageFile);
      } else {
        image_url = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80`;
      }

      const { error: err } = await supabase.from("menu_items").insert({
        restaurant_id: restaurantId,
        category_id: categoryId || null,
        name,
        description: description || null,
        price: parseFloat(price),
        image_url,
        is_available: true,
      });
      if (err) throw err;

      setShowForm(false);
      setName("");
      setDescription("");
      setPrice("");
      setCategoryId("");
      setImageFile(null);
      setImagePreview("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailable = async (item: MenuItem) => {
    await supabase
      .from("menu_items")
      .update({ is_available: !item.is_available })
      .eq("id", item.id);
    setItems(
      items.map((i) =>
        i.id === item.id ? { ...i, is_available: !i.is_available } : i
      )
    );
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this menu item?")) return;
    await supabase.from("menu_items").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted">{items.length} items</p>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="size-4" /> Add item
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={createItem}
          className="rounded-3xl bg-surface border border-border p-5 space-y-4"
        >
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">New menu item</h3>
            <button type="button" onClick={() => setShowForm(false)}>
              <X className="size-5 text-muted" />
            </button>
          </div>

          <label className="block">
            <span className="text-sm font-medium mb-1.5 block">Photo</span>
            <div className="relative h-36 rounded-2xl border-2 border-dashed border-border bg-canvas flex items-center justify-center overflow-hidden cursor-pointer hover:border-brand transition-colors">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="text-center text-muted text-sm">
                  <Upload className="size-6 mx-auto mb-1" />
                  Tap to upload
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                  }
                }}
              />
            </div>
          </label>

          <Input
            id="item-name"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Textarea
            id="item-desc"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            id="item-price"
            label="Price"
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <select
              className="w-full h-12 px-4 rounded-2xl border-2 border-border bg-surface focus:outline-none focus:border-brand"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2 mt-2">
              <input
                className="flex-1 h-10 px-3 rounded-xl border-2 border-border text-sm"
                placeholder="New category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <Button type="button" variant="outline" size="sm" onClick={addCategory}>
                Add
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Save item
          </Button>
        </form>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex gap-3 p-3 rounded-2xl bg-surface border border-border"
          >
            <div className="relative size-20 rounded-xl overflow-hidden bg-canvas shrink-0">
              {item.image_url && (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between gap-2">
                <h4 className="font-semibold truncate">{item.name}</h4>
                <span className="font-bold text-brand text-sm shrink-0">
                  {formatCurrency(item.price)}
                </span>
              </div>
              <p className="text-xs text-muted line-clamp-1 mt-0.5">
                {item.description || "No description"}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => toggleAvailable(item)}
                  className="flex items-center gap-1 text-xs font-medium"
                >
                  {item.is_available ? (
                    <>
                      <ToggleRight className="size-5 text-brand" /> Available
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="size-5 text-muted" /> Unavailable
                    </>
                  )}
                </button>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-xs text-danger font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && !showForm && (
          <p className="text-center text-muted py-12 text-sm">
            No menu items yet. Add your first dish!
          </p>
        )}
      </div>
    </div>
  );
}
