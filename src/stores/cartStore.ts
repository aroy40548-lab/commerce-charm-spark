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

const MAX_PER_LINE = 20;

function stockOf(item: CartItem) {
  const v = item.product.node.variants.edges.find((e) => e.node.id === item.variantId)?.node;
  return v?.quantityAvailable ?? MAX_PER_LINE;
}

// The bag lives in the browser; prices and stock are re-checked on the server at checkout.
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      addItem: async (item) => {
        const existing = get().items.find((i) => i.variantId === item.variantId);
        const qty = (existing?.quantity ?? 0) + item.quantity;
        const max = Math.min(stockOf(item), MAX_PER_LINE);
        if (max <= 0) throw new Error("This size just sold out");
        if (qty > max) throw new Error(`Only ${max} available in this size`);
        set({
          items: existing
            ? get().items.map((i) => (i.variantId === item.variantId ? { ...i, product: item.product, price: item.price, quantity: qty } : i))
            : [...get().items, item],
        });
      },

      updateQuantity: async (variantId, quantity) => {
        if (quantity <= 0) return get().removeItem(variantId);
        set({
          items: get().items.map((i) =>
            i.variantId === variantId ? { ...i, quantity: Math.min(quantity, Math.max(stockOf(i), 1), MAX_PER_LINE) } : i,
          ),
        });
      },

      removeItem: async (variantId) => { set({ items: get().items.filter((i) => i.variantId !== variantId) }); },
      clearCart: () => set({ items: [] }),
    }),
    {
      name: "zankyo-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
    },
  ),
);
