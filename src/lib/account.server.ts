import type { supabaseAdmin } from "@/integrations/supabase/client.server";
import { BANNED_MESSAGE, SUSPENDED_MESSAGE, canOrder, canUseReels } from "./accountStatus";
type Db = typeof supabaseAdmin;

export async function accountStatus(sb: Db, userId: string) {
  const { data } = await sb.from("profiles").select("account_status").eq("id", userId).maybeSingle();
  return data?.account_status ?? "active";
}

export async function assertCanUseReels(sb: Db, userId: string) {
  if (!canUseReels(await accountStatus(sb, userId))) throw new Error(SUSPENDED_MESSAGE);
}

/** Checks the account and any account sharing the order email. */
export async function assertCanOrder(sb: Db, userId: string | null, email: string) {
  if (userId && !canOrder(await accountStatus(sb, userId))) throw new Error(BANNED_MESSAGE);
  if (email) {
    const { data } = await sb.from("profiles").select("id").ilike("email", email.trim()).eq("account_status", "banned").limit(1);
    if (data?.length) throw new Error(BANNED_MESSAGE);
  }
}

/** User ids whose reels/profiles must not be shown publicly. */
export async function hiddenCreators(sb: Db) {
  const { data } = await sb.from("profiles").select("id").neq("account_status", "active");
  return new Set((data ?? []).map((r) => r.id));
}
