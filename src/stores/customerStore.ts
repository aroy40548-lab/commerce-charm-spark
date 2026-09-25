import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { customerLogin, customerLogout, customerRegister } from "@/lib/shopifyCustomer";

interface CustomerStore {
  token: string | null;
  expiresAt: string | null;
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (i: { firstName: string; lastName: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  validToken: () => string | null;
}

export const useCustomerStore = create<CustomerStore>()(
  persist(
    (set, get) => ({
      token: null,
      expiresAt: null,
      email: null,
      login: async (email, password) => {
        const t = await customerLogin(email, password);
        set({ token: t.accessToken, expiresAt: t.expiresAt, email });
      },
      register: async (i) => {
        await customerRegister(i);
        await get().login(i.email, i.password);
      },
      logout: async () => {
        const t = get().token;
        set({ token: null, expiresAt: null, email: null });
        if (t) await customerLogout(t);
      },
      validToken: () => {
        const { token, expiresAt } = get();
        if (!token || !expiresAt) return null;
        if (new Date(expiresAt).getTime() < Date.now()) {
          set({ token: null, expiresAt: null, email: null });
          return null;
        }
        return token;
      },
    }),
    { name: "zankyo-customer", storage: createJSONStorage(() => localStorage) },
  ),
);
