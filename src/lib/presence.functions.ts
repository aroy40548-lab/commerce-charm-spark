import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** A visitor counts as "active now" if their page pinged within this window. */
export const ACTIVE_MS = 90_000;
/** A gap longer than this starts a new visit. */
const NEW_VISIT_MS = 30 * 60_000;

const CartLine = z.object({ title: z.string().max(120), variant: z.string().max(60), qty: z.number().int().min(1).max(99), price: z.number().min(0).max(1e6) });

export const presenceHeartbeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ path: z.string().max(200), device: z.string().max(20), cart: z.array(CartLine).max(50) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const { data: prev } = await db.from("user_presence").select("visits, last_seen_at, session_started_at").eq("user_id", context.userId).maybeSingle();
    const newVisit = !prev || now.getTime() - new Date(prev.last_seen_at).getTime() > NEW_VISIT_MS;
    const cartCount = data.cart.reduce((n, l) => n + l.qty, 0);
    const cartValue = data.cart.reduce((n, l) => n + l.qty * l.price, 0);
    await db.from("user_presence").upsert({
      user_id: context.userId, path: data.path, device: data.device,
      cart_count: cartCount, cart_value: cartValue, cart_items: data.cart,
      visits: (prev?.visits ?? 0) + (newVisit ? 1 : 0),
      session_started_at: newVisit ? now.toISOString() : prev!.session_started_at,
      last_seen_at: now.toISOString(),
    });
    const { data: nudges } = await db.from("user_nudges").select("id, body, link, created_at").eq("user_id", context.userId).is("seen_at", null).order("created_at").limit(3);
    return { nudges: nudges ?? [] };
  });

export const dismissNudge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    await db.from("user_nudges").update({ seen_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

const SOLD = ["paid", "confirmed", "shipped", "delivered"];

export const adminLiveVisitors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ filter: z.enum(["active", "today", "all"]).default("active") }).parse(d))
  .handler(async ({ data, context }) => {
    const g = await import("./admin/guard.server");
    await g.requireStaff(context as never);
    const db = g.db;
    let q = db.from("user_presence").select("*").order("last_seen_at", { ascending: false }).limit(300);
    if (data.filter === "active") q = q.gte("last_seen_at", new Date(Date.now() - ACTIVE_MS).toISOString());
    if (data.filter === "today") q = q.gte("last_seen_at", new Date(Date.now() - 86_400_000).toISOString());
    const { data: rows } = await q;
    const ids = (rows ?? []).map((r) => r.user_id);
    const none = ["00000000-0000-0000-0000-000000000000"];
    const [{ data: profs }, { data: orders }, { count: activeNow }] = await Promise.all([
      db.from("profiles").select("id, email, full_name, username").in("id", ids.length ? ids : none),
      db.from("orders").select("user_id, total").in("status", SOLD).in("user_id", ids.length ? ids : none),
      db.from("user_presence").select("user_id", { count: "exact", head: true }).gte("last_seen_at", new Date(Date.now() - ACTIVE_MS).toISOString()),
    ]);
    const pm = new Map((profs ?? []).map((p) => [p.id, p]));
    const om = new Map<string, { n: number; spent: number }>();
    for (const o of orders ?? []) { const c = om.get(o.user_id!) ?? { n: 0, spent: 0 }; c.n++; c.spent += Number(o.total); om.set(o.user_id!, c); }
    return {
      activeNow: activeNow ?? 0,
      rows: (rows ?? []).map((r) => {
        const p = pm.get(r.user_id);
        return {
          userId: r.user_id, name: p?.full_name || p?.email || "Customer", username: p?.username ?? null, email: p?.email ?? "",
          path: r.path, device: r.device, cartCount: r.cart_count, cartValue: Number(r.cart_value),
          cartItems: (r.cart_items ?? []) as Array<z.infer<typeof CartLine>>,
          visits: r.visits, firstSeen: r.first_seen_at, sessionStart: r.session_started_at, lastSeen: r.last_seen_at,
          active: Date.now() - new Date(r.last_seen_at).getTime() < ACTIVE_MS,
          orders: om.get(r.user_id)?.n ?? 0, spent: om.get(r.user_id)?.spent ?? 0,
        };
      }),
    };
  });

export const adminSendNudge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    userIds: z.array(z.string().uuid()).min(1).max(200),
    body: z.string().trim().min(1).max(280),
    link: z.string().max(200).regex(/^\/[^/\\]/, "Link must be a page on this site, like /shop").optional().or(z.literal("")),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const g = await import("./admin/guard.server");
    const me = await g.requireStaff(context as never, "customers");
    const { error } = await g.db.from("user_nudges").insert(data.userIds.map((id) => ({ user_id: id, body: data.body, link: data.link || null, sent_by: me.name })));
    if (error) throw new Error(error.message);
    return { sent: data.userIds.length };
  });
