import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  CUSTOMER_CREATE, CUSTOMER_RECOVER, CUSTOMER_TOKEN_CREATE, CUSTOMER_TOKEN_DELETE, firstUserError, storefrontApiRequest,
} from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";

interface CustomerStore {
  accessToken: string | null;
  expiresAt: string | null;
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { firstName: string; lastName: string; email: string; password: string }) => Promise<void>;
  recover: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  isSignedIn: () => boolean;
}

function friendly(msg: string) {
  if (/unidentified customer/i.test(msg)) return "Wrong email or password";
  if (/taken/i.test(msg)) return "An account with this email already exists — sign in instead";
  if (/access denied/i.test(msg)) return "Customer accounts aren't switched on in the store yet. Please try again later.";
  return msg;
}

export const useCustomerStore = create<CustomerStore>()(
  persist(
    (set, get) => ({
      accessToken: null,
      expiresAt: null,
      email: null,

      login: async (email, password) => {
        let data;
        try {
          data = await storefrontApiRequest(CUSTOMER_TOKEN_CREATE, { input: { email, password } });
        } catch (e) {
          throw new Error(friendly(e instanceof Error ? e.message : "Sign-in failed"));
        }
        const res = data?.data?.customerAccessTokenCreate;
        const err = firstUserError(res?.customerUserErrors);
        if (err || !res?.customerAccessToken) throw new Error(friendly(err ?? "Wrong email or password"));
        set({ accessToken: res.customerAccessToken.accessToken, expiresAt: res.customerAccessToken.expiresAt, email });
        await useCartStore.getState().linkCustomer(res.customerAccessToken.accessToken, email);
      },

      register: async (input) => {
        let data;
        try {
          data = await storefrontApiRequest(CUSTOMER_CREATE, { input });
        } catch (e) {
          throw new Error(friendly(e instanceof Error ? e.message : "Could not create account"));
        }
        const err = firstUserError(data?.data?.customerCreate?.customerUserErrors);
        if (err) throw new Error(friendly(err));
        await get().login(input.email, input.password);
      },

      recover: async (email) => {
        const data = await storefrontApiRequest(CUSTOMER_RECOVER, { email });
        const err = firstUserError(data?.data?.customerRecover?.customerUserErrors);
        if (err) throw new Error(friendly(err));
      },

      logout: async () => {
        const token = get().accessToken;
        set({ accessToken: null, expiresAt: null, email: null });
        if (token) await storefrontApiRequest(CUSTOMER_TOKEN_DELETE, { customerAccessToken: token }).catch(() => {});
      },

      isSignedIn: () => {
        const { accessToken, expiresAt } = get();
        return !!accessToken && !!expiresAt && new Date(expiresAt) > new Date();
      },
    }),
    { name: "zankyo-customer", storage: createJSONStorage(() => localStorage) },
  ),
);

// Reactive hook: returns the token only while it's valid.
export function useCustomerToken() {
  const accessToken = useCustomerStore((s) => s.accessToken);
  const expiresAt = useCustomerStore((s) => s.expiresAt);
  return accessToken && expiresAt && new Date(expiresAt) > new Date() ? accessToken : null;
}
