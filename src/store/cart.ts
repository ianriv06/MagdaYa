"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, MenuItem } from "@/lib/types";

interface CartState {
  items: CartItem[];
  orderType: "delivery" | "pickup";
  deliveryAddress: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
  notes: string;
  whatsapp: string;
  addItem: (menuItem: MenuItem, restaurantId: string, restaurantName: string) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  setOrderType: (type: "delivery" | "pickup") => void;
  setDeliveryAddress: (address: string, lat?: number, lng?: number) => void;
  setNotes: (notes: string) => void;
  setWhatsapp: (whatsapp: string) => void;
  subtotal: () => number;
  itemCount: () => number;
  restaurantId: () => string | null;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      orderType: "delivery",
      deliveryAddress: "",
      deliveryLat: null,
      deliveryLng: null,
      notes: "",
      whatsapp: "",

      addItem: (menuItem, restaurantId, restaurantName) => {
        const state = get();
        const currentRestaurant = state.restaurantId();

        if (currentRestaurant && currentRestaurant !== restaurantId) {
            if (
            !confirm(
              "Tu carrito tiene productos de otro restaurante. ¿Vaciar carrito y agregar este producto?"
            )
          ) {
            return;
          }
          set({ items: [] });
        }

        const existing = get().items.find((i) => i.menuItem.id === menuItem.id);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.menuItem.id === menuItem.id
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          });
        } else {
          set({
            items: [
              ...get().items,
              { menuItem, quantity: 1, restaurantId, restaurantName },
            ],
          });
        }
      },

      removeItem: (menuItemId) => {
        set({ items: get().items.filter((i) => i.menuItem.id !== menuItemId) });
      },

      updateQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.menuItem.id === menuItemId ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () =>
        set({
          items: [],
          notes: "",
          whatsapp: "",
          deliveryAddress: "",
          deliveryLat: null,
          deliveryLng: null,
        }),

      setOrderType: (orderType) => set({ orderType }),
      setDeliveryAddress: (address, lat, lng) =>
        set({
          deliveryAddress: address,
          deliveryLat: lat ?? null,
          deliveryLng: lng ?? null,
        }),
      setNotes: (notes) => set({ notes }),
      setWhatsapp: (whatsapp) => set({ whatsapp }),

      subtotal: () =>
        get().items.reduce(
          (sum, i) => sum + Number(i.menuItem.price) * i.quantity,
          0
        ),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      restaurantId: () => get().items[0]?.restaurantId ?? null,
    }),
    { name: "magdaya-cart" }
  )
);
