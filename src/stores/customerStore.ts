import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  CUSTOMER_PROFILE_QUERY,
  customerLoginConfigured,
  customerLogoutUrl,
  customerQuery,
  refreshCustomerTokens,
  startCustomerLogin,
  type CustomerTokens,
} from "@/lib/customerAccount";

interface Profile { id: string; firstName: string | null; lastName: string | null; email: string | null }

interface CustomerStore {
  tokens: CustomerTokens | null;
  profile: Profile | null;
  email: string | null;
  setSession: (tokens: CustomerTokens) => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  signOut: () => void;
}

// sessionStorage: stays signed in across pages/refreshes, ends when the browser closes.
export const useCustomerStore = create<CustomerStore>()(
  persist(
    (set, get) => ({
      tokens: null,
      profile: null,
      email: null,
      setSession: async (tokens) => {
        set({ tokens });
        const d = await customerQuery(tokens.accessToken, CUSTOMER_PROFILE_QUERY);
        const c = d.customer;
        const email = c?.emailAddress?.emailAddress ?? null;
        set({ profile: { id: c.id, firstName: c.firstName, lastName: c.lastName, email }, email });
      },
      getAccessToken: async () => {
        const t = get().tokens;
        if (!t) return null;
        if (t.expiresAt - Date.now() > 60_000) return t.accessToken;
        try {
          const next = await refreshCustomerTokens(t.refreshToken);
          set({ tokens: { ...next, idToken: next.idToken ?? t.idToken } });
          return next.accessToken;
        } catch {
          set({ tokens: null, profile: null, email: null });
          return null;
        }
      },
      signOut: () => {
        const idToken = get().tokens?.idToken;
        set({ tokens: null, profile: null, email: null });
        window.location.assign(customerLogoutUrl(idToken));
      },
    }),
    { name: "zankyo-customer-session", storage: createJSONStorage(() => sessionStorage) },
  ),
);

export function signIn(returnTo?: string) {
  if (!customerLoginConfigured()) {
    alert("Customer sign-in is being set up. Please try again soon.");
    return;
  }
  void startCustomerLogin(returnTo);
}

export function useCustomerToken(): string | null {
  return useCustomerStore((s) => s.tokens?.accessToken ?? null);
}
