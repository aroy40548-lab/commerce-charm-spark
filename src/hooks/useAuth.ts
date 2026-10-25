import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// One shared Lovable Cloud session for the whole app (customers and staff).
let state: { session: Session | null; loading: boolean } = { session: null, loading: true };
const listeners = new Set<() => void>();
let started = false;

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const set = (session: Session | null) => {
    state = { session, loading: false };
    listeners.forEach((l) => l());
  };
  supabase.auth.getSession().then(({ data }) => set(data.session));
  supabase.auth.onAuthStateChange((_e, s) => set(s));
}

const SERVER = { session: null, loading: true };

export function useAuth() {
  const s = useSyncExternalStore(
    (cb) => { start(); listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
    () => SERVER,
  );
  const user = s.session?.user ?? null;
  const meta = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
  const name = meta["full_name"] || meta["name"] || meta["first_name"] || user?.email?.split("@")[0] || "";
  return { session: s.session, user, loading: s.loading, name };
}

export async function signOut() {
  await supabase.auth.signOut();
}
