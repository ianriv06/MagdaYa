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
import { Plus, X, ToggleLeft, ToggleRight, Upload, Pencil } from "lucide-react";

export default function RestaurantMenuPage() {
  return (
    <RestaurantLayout title="Menú">
      {(restaurant) => <MenuManager restaurantId={restaurant.id} />}
    </RestaurantLayout>
  );
}

function MenuManager({ restaurantId }: { restaurantId: string }) {
  const supabase = createClient();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
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

  const resetForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setName("");
    setDescription("");
    setPrice("");
    setCategoryId("");
    setImageFile(null);
    setImagePreview("");
    setError("");
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || "");
    setPrice(String(item.price));
    setCategoryId(item.category_id || "");
    setImageFile(null);
    setImagePreview(item.image_url || "");
    setError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let image_url: string | null = editingItem?.image_url || null;
      if (imageFile) {
        image_url = await uploadImage(imageFile);
      } else if (!editingItem) {
        image_url = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80`;
      }

      const payload = {
        category_id: categoryId || null,
        name,
        description: description || null,
        price: parseFloat(price),
        image_url,
      };

      if (editingItem) {
        const { error: err } = await supabase
          .from("menu_items")
          .update(payload)
          .eq("id", editingItem.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("menu_items").insert({
          restaurant_id: restaurantId,
          ...payload,
          is_available: true,
        });
        if (err) throw err;
      }

      resetForm();
      await load();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : editingItem
            ? "Error al guardar cambios"
            : "Error al agregar platillo"
      );
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
    if (!confirm("¿Eliminar este platillo?")) return;
    await supabase.from("menu_items").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
    if (editingItem?.id === id) resetForm();
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted">{items.length} productos</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" /> Agregar
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={saveItem}
          className="rounded-3xl bg-surface border border-border p-5 space-y-4"
        >
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">
              {editingItem ? "Editar platillo" : "Nuevo platillo"}
            </h3>
            <button type="button" onClick={resetForm}>
              <X className="size-5 text-muted" />
            </button>
          </div>

          <label className="block">
            <span className="text-sm font-medium mb-1.5 block">Foto</span>
            <div className="relative h-36 rounded-2xl border-2 border-dashed border-border bg-canvas flex items-center justify-center overflow-hidden cursor-pointer hover:border-brand transition-colors">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Vista previa"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="text-center text-muted text-sm">
                  <Upload className="size-6 mx-auto mb-1" />
                  Toca para subir
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
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Textarea
            id="item-desc"
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            id="item-price"
            label="Precio"
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Categoría</label>
            <select
              className="w-full h-12 px-4 rounded-2xl border-2 border-border bg-surface focus:outline-none focus:border-brand"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2 mt-2">
              <input
                className="flex-1 h-10 px-3 rounded-xl border-2 border-border text-sm"
                placeholder="Nueva categoría"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCategory}
              >
                Agregar
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            {editingItem ? "Guardar cambios" : "Guardar platillo"}
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
                {item.description || "Sin descripción"}
              </p>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2">
                <button
                  onClick={() => toggleAvailable(item)}
                  className="flex items-center gap-1 text-xs font-medium"
                >
                  {item.is_available ? (
                    <>
                      <ToggleRight className="size-5 text-brand" /> Disponible
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="size-5 text-muted" /> No disponible
                    </>
                  )}
                </button>
                <button
                  onClick={() => openEdit(item)}
                  className="flex items-center gap-1 text-xs font-medium text-ink"
                >
                  <Pencil className="size-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-xs text-danger font-medium"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && !showForm && (
          <p className="text-center text-muted py-12 text-sm">
            Aún no hay platillos. ¡Agrega el primero!
          </p>
        )}
      </div>
    </div>
  );
}
