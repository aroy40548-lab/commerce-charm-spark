import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function db() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

const codeSchema = z.string().trim().min(3).max(24).regex(/^[A-Za-z0-9_-]+$/);

export const getAffiliateProgram = createServerFn({ method: "GET" }).handler(async () => {
  const { getSettings } = await import("./store.server");
  const s = await getSettings();
  return { enabled: s.affiliates_enabled, rate: Number(s.affiliate_rate), cookieDays: s.affiliate_cookie_days };
});

export const trackAffiliateClick = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: codeSchema }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    await sb.rpc("track_affiliate_click", { _code: data.code });
    return { ok: true };
  });

export const getMyAffiliate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await db();
    const { data: a } = await sb.from("affiliates").select("*").eq("user_id", context.userId).maybeSingle();
    if (!a) return null;
    const { data: rows } = await sb
      .from("affiliate_commissions")
      .select("id, amount, order_amount, rate, status, created_at, orders(order_number)")
      .eq("affiliate_id", a.id)
      .order("created_at", { ascending: false })
      .limit(200);
    const list = rows ?? [];
    const sum = (s: string) => list.filter((r) => r.status === s).reduce((t, r) => t + Number(r.amount), 0);
    return {
      affiliate: a,
      totals: { pending: sum("pending"), approved: sum("approved"), paid: sum("paid"), orders: list.filter((r) => r.status !== "rejected").length },
      commissions: list.map((r) => ({ id: r.id, amount: Number(r.amount), orderAmount: Number(r.order_amount), rate: Number(r.rate), status: r.status, createdAt: r.created_at, order: r.orders ? `ZK${r.orders.order_number}` : "" })),
    };
  });

export const joinAffiliate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: codeSchema.optional(), upi: z.string().trim().max(80).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    const { getSettings } = await import("./store.server");
    if (!(await getSettings()).affiliates_enabled) throw new Error("The affiliate program is paused right now.");
    const { data: existing } = await sb.from("affiliates").select("id").eq("user_id", context.userId).maybeSingle();
    if (existing) return { ok: true };
    const email = String((context.claims as { email?: string }).email ?? "");
    const { data: profile } = await sb.from("profiles").select("first_name, last_name").eq("id", context.userId).maybeSingle();
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || email.split("@")[0] || "";
    const base = (data.code ?? (profile?.first_name || email.split("@")[0] || "ZK")).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "ZK";
    for (let i = 0; i < 6; i++) {
      const code = i === 0 && data.code ? data.code.toUpperCase() : `${base}${Math.floor(100 + Math.random() * 900)}`;
      const { error } = await sb.from("affiliates").insert({ user_id: context.userId, email, name, code, payout_upi: data.upi || null });
      if (!error) return { ok: true };
      if (data.code && i === 0) throw new Error("That code is taken. Try another one.");
    }
    throw new Error("Couldn't create your link, please try again.");
  });

export const updateMyPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ upi: z.string().trim().max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    await sb.from("affiliates").update({ payout_upi: data.upi || null }).eq("user_id", context.userId);
    return { ok: true };
  });
