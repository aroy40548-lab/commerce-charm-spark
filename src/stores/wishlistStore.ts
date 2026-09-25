import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface WishlistItem {
  handle: string;
  title: string;
  image: string | null;
  price: string;
  currencyCode: string;
}

interface WishlistStore {
  items: WishlistItem[];
  toggle: (item: WishlistItem) => void;
  has: (handle: string) => boolean;
  remove: (handle: string) => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) => {
        const exists = get().items.some((i) => i.handle === item.handle);
        set({
          items: exists ? get().items.filter((i) => i.handle !== item.handle) : [...get().items, item],
        });
      },
      has: (handle) => get().items.some((i) => i.handle === handle),
      remove: (handle) => set({ items: get().items.filter((i) => i.handle !== handle) }),
    }),
    { name: "zankyo-wishlist", storage: createJSONStorage(() => localStorage) },
  ),
);
