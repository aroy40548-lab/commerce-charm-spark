import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SECTION_KEYS, type Section, type StaffSession } from "./permissions";

type AuthContext = { userId: string; claims: Record<string, unknown> };

// Staff are matched by email the first time they sign in, so that email must have
// been proven (email code or Google) — a bare password sign-up proves nothing.
function verifiedLogin(claims: Record<string, unknown>) {
  const amr = (claims["amr"] as Array<{ method?: string }> | undefined) ?? [];
  return amr.length === 0 || amr.some((m) => m.method !== "password");
}

export async function loadStaff(ctx: AuthContext): Promise<StaffSession | null> {
  const email = String(ctx.claims["email"] ?? "").toLowerCase();
  const { data: owner } = await supabaseAdmin
    .from("user_roles").select("id").eq("user_id", ctx.userId).eq("role", "admin").maybeSingle();

  let { data: member } = await supabaseAdmin
    .from("staff_members").select("*, staff_roles(name, permissions)").eq("user_id", ctx.userId).maybeSingle();
  if (!member && email && verifiedLogin(ctx.claims)) {
    const { data: invited } = await supabaseAdmin
      .from("staff_members").select("*, staff_roles(name, permissions)").ilike("email", email).is("user_id", null).maybeSingle();
    if (invited) {
      await supabaseAdmin.from("staff_members").update({ user_id: ctx.userId }).eq("id", invited.id);
      member = { ...invited, user_id: ctx.userId };
    }
  }

  if (!owner && (!member || !member.active)) return null;
  if (member) void supabaseAdmin.from("staff_members").update({ last_seen_at: new Date().toISOString() }).eq("id", member.id);

  const perms = (member?.staff_roles?.permissions ?? []).filter((p): p is Section => SECTION_KEYS.includes(p as Section));
  return {
    userId: ctx.userId,
    email,
    name: member?.name || email.split("@")[0] || "Staff",
    isOwner: !!owner,
    roleName: owner ? "Store owner" : member?.staff_roles?.name ?? "View only",
    canEdit: owner ? SECTION_KEYS : perms,
  };
}

/** Any staff member may read; pass a section to require edit rights for it. */
export async function requireStaff(ctx: AuthContext, section?: Section) {
  const me = await loadStaff(ctx);
  if (!me) throw new Error("You don't have access to the admin panel.");
  if (section && !me.isOwner && !me.canEdit.includes(section)) {
    throw new Error(`Your role can view ${section} but not change it. Ask the store owner for access.`);
  }
  return me;
}

export async function logOrderEvent(orderId: string, message: string, actor: string, kind = "note") {
  await supabaseAdmin.from("order_events").insert({ order_id: orderId, message, actor, kind });
}

export { supabaseAdmin as db };
