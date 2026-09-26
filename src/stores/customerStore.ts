import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { SHOPIFY_STORE_PERMANENT_DOMAIN } from "@/lib/shopify";

// The store uses Shopify's new customer accounts (one-time email code).
// Sign-in happens on Shopify's own hosted account page; this app never
// sees a password or customer access token.
export const SHOPIFY_ACCOUNT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/account`;

export function openShopifyAccount() {
  window.open(SHOPIFY_ACCOUNT_URL, "_blank", "noopener");
}

interface CustomerStore {
  // Remembered locally only, to prefill nothing sensitive — just a hint
  // that the visitor has signed in on Shopify before.
  email: string | null;
  setEmail: (email: string | null) => void;
}

export const useCustomerStore = create<CustomerStore>()(
  persist(
    (set) => ({
      email: null,
      setEmail: (email) => set({ email }),
    }),
    { name: "zankyo-customer", storage: createJSONStorage(() => localStorage) },
  ),
);

// Kept for compatibility with existing imports. With Shopify's hosted
// one-time-code accounts there is no token available to the storefront.
export function useCustomerToken(): string | null {
  return null;
}
