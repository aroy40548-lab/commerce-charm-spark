import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Product } from "@/lib/catalog";

export interface CartItem {
  product: Product;
  variantId: string;
  variantTitle: string;
  price: { amount: string; currencyCode: string };
  quantity: number;
  selectedOptions: Array<{ name: string; value: string }>;
}

interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  addItem: (item: CartItem) => Promise<void>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      addItem: async (item) => {
        const items = get().items;
        const existing = items.find((i) => i.variantId === item.variantId);
        set({
          items: existing
            ? items.map((i) => (i.variantId === item.variantId ? { ...i, quantity: i.quantity + item.quantity } : i))
            : [...items, item],
        });
      },
      updateQuantity: async (variantId, quantity) => {
        if (quantity <= 0) { await get().removeItem(variantId); return; }
        set({ items: get().items.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)) });
      },
      removeItem: async (variantId) => set({ items: get().items.filter((i) => i.variantId !== variantId) }),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: "zankyo-cart-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
    },
  ),
);
