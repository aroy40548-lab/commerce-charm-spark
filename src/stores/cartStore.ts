import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Product } from "@/lib/catalog";
import {
  CART_BUYER_IDENTITY_MUTATION, CART_CREATE_MUTATION, CART_LINES_ADD_MUTATION, CART_LINES_REMOVE_MUTATION,
  CART_LINES_UPDATE_MUTATION, CART_QUERY, formatCheckoutUrl, isCartNotFoundError, storefrontApiRequest,
} from "@/lib/shopify";

export interface CartItem {
  lineId: string | null;
  product: Product;
  variantId: string;
  variantTitle: string;
  price: { amount: string; currencyCode: string };
  quantity: number;
  selectedOptions: Array<{ name: string; value: string }>;
}

interface CartStore {
  items: CartItem[];
  cartId: string | null;
  checkoutUrl: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  addItem: (item: Omit<CartItem, "lineId">) => Promise<void>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  clearCart: () => void;
  syncCart: () => Promise<void>;
  linkCustomer: (accessToken: string, email?: string) => Promise<void>;
  getCheckoutUrl: () => string | null;
}

type LineEdge = { node: { id: string; merchandise: { id: string } } };

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,
      checkoutUrl: null,
      isLoading: false,
      isSyncing: false,

      addItem: async (item) => {
        const { items, cartId, clearCart } = get();
        const existing = items.find((i) => i.variantId === item.variantId);
        set({ isLoading: true });
        try {
          if (!cartId) {
            const token = readCustomerToken();
            const input: Record<string, unknown> = { lines: [{ quantity: item.quantity, merchandiseId: item.variantId }] };
            if (token) input["buyerIdentity"] = { customerAccessToken: token };
            const data = await storefrontApiRequest(CART_CREATE_MUTATION, { input });
            const cart = data?.data?.cartCreate?.cart;
            if (data?.data?.cartCreate?.userErrors?.length) throw new Error(data.data.cartCreate.userErrors[0].message);
            const lineId = cart?.lines?.edges?.[0]?.node?.id;
            if (cart?.checkoutUrl && lineId) {
              set({ cartId: cart.id, checkoutUrl: formatCheckoutUrl(cart.checkoutUrl), items: [{ ...item, lineId }] });
            }
          } else if (existing?.lineId) {
            const qty = existing.quantity + item.quantity;
            const data = await storefrontApiRequest(CART_LINES_UPDATE_MUTATION, { cartId, lines: [{ id: existing.lineId, quantity: qty }] });
            const errs = data?.data?.cartLinesUpdate?.userErrors ?? [];
            if (isCartNotFoundError(errs)) { clearCart(); return get().addItem(item); }
            if (errs.length) throw new Error(errs[0].message);
            set({ items: get().items.map((i) => (i.variantId === item.variantId ? { ...i, quantity: qty } : i)) });
          } else {
            const data = await storefrontApiRequest(CART_LINES_ADD_MUTATION, { cartId, lines: [{ quantity: item.quantity, merchandiseId: item.variantId }] });
            const errs = data?.data?.cartLinesAdd?.userErrors ?? [];
            if (isCartNotFoundError(errs)) { clearCart(); return get().addItem(item); }
            if (errs.length) throw new Error(errs[0].message);
            const line = (data?.data?.cartLinesAdd?.cart?.lines?.edges ?? []).find((l: LineEdge) => l.node.merchandise.id === item.variantId);
            set({ items: [...get().items, { ...item, lineId: line?.node?.id ?? null }] });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      updateQuantity: async (variantId, quantity) => {
        if (quantity <= 0) return get().removeItem(variantId);
        const { items, cartId, clearCart } = get();
        const item = items.find((i) => i.variantId === variantId);
        if (!item?.lineId || !cartId) return;
        set({ isLoading: true });
        try {
          const data = await storefrontApiRequest(CART_LINES_UPDATE_MUTATION, { cartId, lines: [{ id: item.lineId, quantity }] });
          const errs = data?.data?.cartLinesUpdate?.userErrors ?? [];
          if (isCartNotFoundError(errs)) clearCart();
          else if (!errs.length) set({ items: get().items.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)) });
        } catch (e) {
          console.error("Failed to update quantity:", e);
        } finally {
          set({ isLoading: false });
        }
      },

      removeItem: async (variantId) => {
        const { items, cartId, clearCart } = get();
        const item = items.find((i) => i.variantId === variantId);
        if (!item?.lineId || !cartId) { set({ items: items.filter((i) => i.variantId !== variantId) }); return; }
        set({ isLoading: true });
        try {
          const data = await storefrontApiRequest(CART_LINES_REMOVE_MUTATION, { cartId, lineIds: [item.lineId] });
          const errs = data?.data?.cartLinesRemove?.userErrors ?? [];
          if (isCartNotFoundError(errs)) clearCart();
          else if (!errs.length) {
            const next = get().items.filter((i) => i.variantId !== variantId);
            if (next.length === 0) clearCart(); else set({ items: next });
          }
        } catch (e) {
          console.error("Failed to remove item:", e);
        } finally {
          set({ isLoading: false });
        }
      },

      clearCart: () => set({ items: [], cartId: null, checkoutUrl: null }),
      getCheckoutUrl: () => get().checkoutUrl,

      syncCart: async () => {
        const { cartId, isSyncing, clearCart } = get();
        if (!cartId || isSyncing) return;
        set({ isSyncing: true });
        try {
          const data = await storefrontApiRequest(CART_QUERY, { id: cartId });
          if (!data) return;
          const cart = data?.data?.cart;
          if (!cart || cart.totalQuantity === 0) clearCart();
        } catch (e) {
          console.error("Failed to sync cart:", e);
        } finally {
          set({ isSyncing: false });
        }
      },

      // Links the cart to the signed-in Shopify customer so checkout is prefilled
      // and the order shows up in their account.
      linkCustomer: async (accessToken, email) => {
        const { cartId } = get();
        if (!cartId) return;
        try {
          const data = await storefrontApiRequest(CART_BUYER_IDENTITY_MUTATION, {
            cartId, buyerIdentity: { customerAccessToken: accessToken, ...(email ? { email } : {}) },
          });
          const url = data?.data?.cartBuyerIdentityUpdate?.cart?.checkoutUrl;
          if (url) set({ checkoutUrl: formatCheckoutUrl(url) });
        } catch (e) {
          console.error("Failed to link cart to customer:", e);
        }
      },
    }),
    {
      name: "zankyo-shopify-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items, cartId: s.cartId, checkoutUrl: s.checkoutUrl }),
    },
  ),
);

function readCustomerToken(): string | null {
  try {
    const raw = localStorage.getItem("zankyo-customer");
    const t = raw ? JSON.parse(raw)?.state : null;
    if (t?.accessToken && t?.expiresAt && new Date(t.expiresAt) > new Date()) return t.accessToken;
  } catch { /* ignore */ }
  return null;
}
