import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function guard(context: unknown, edit = false) {
  const g = await import("./guard.server");
  const me = await g.requireStaff(context as never, edit ? "customers" : undefined);
  return { me, db: g.db };
}

const SOLD = ["paid", "confirmed", "shipped", "delivered"];

export const adminListCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ segment: z.enum(["all", "repeat", "none", "big", "recent", "affiliates"]).default("all"), q: z.string().max(100).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context);
    const [{ data: profiles }, { data: orders }, { data: affiliates }, { data: notes }] = await Promise.all([
      db.from("profiles").select("id, email, first_name, last_name, phone, created_at").order("created_at", { ascending: false }).limit(5000),
      db.from("orders").select("user_id, total, created_at").in("status", SOLD).not("user_id", "is", null).limit(20000),
      db.from("affiliates").select("user_id"),
      db.from("customer_notes").select("user_id, tags"),
    ]);
    const stats = new Map<string, { orders: number; spent: number; last: string }>();
    for (const o of orders ?? []) {
      const s = stats.get(o.user_id!) ?? { orders: 0, spent: 0, last: "" };
      s.orders++; s.spent += Number(o.total); if (o.created_at > s.last) s.last = o.created_at;
      stats.set(o.user_id!, s);
    }
    const aff = new Set((affiliates ?? []).map((a) => a.user_id));
    const tags = new Map((notes ?? []).map((n) => [n.user_id, n.tags]));
    const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const needle = data.q?.trim().toLowerCase();
    return (profiles ?? [])
      .map((p) => {
        const s = stats.get(p.id) ?? { orders: 0, spent: 0, last: "" };
        return { id: p.id, email: p.email ?? "", name: [p.first_name, p.last_name].filter(Boolean).join(" "), phone: p.phone, joined: p.created_at, ...s, affiliate: aff.has(p.id), tags: tags.get(p.id) ?? [] };
      })
      .filter((c) => {
        if (needle && !`${c.email} ${c.name} ${c.phone ?? ""} ${c.tags.join(" ")}`.toLowerCase().includes(needle)) return false;
        switch (data.segment) {
          case "repeat": return c.orders >= 2;
          case "none": return c.orders === 0;
          case "big": return c.spent >= 5000;
          case "recent": return c.last >= monthAgo;
          case "affiliates": return c.affiliate;
          default: return true;
        }
      })
      .slice(0, 1000);
  });

export const adminGetCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context);
    const [{ data: profile }, { data: orders }, { data: addresses }, { data: note }, { data: affiliate }, { data: reviews }] = await Promise.all([
      db.from("profiles").select("*").eq("id", data.id).single(),
      db.from("orders").select("id, order_number, created_at, total, status, payment_method").eq("user_id", data.id).order("created_at", { ascending: false }),
      db.from("addresses").select("*").eq("user_id", data.id),
      db.from("customer_notes").select("*").eq("user_id", data.id).maybeSingle(),
      db.from("affiliates").select("code, status, clicks").eq("user_id", data.id).maybeSingle(),
      db.from("product_reviews").select("id, product_handle, rating, body, created_at").eq("customer_id", data.id),
    ]);
    if (!profile) throw new Error("Customer not found");
    const sold = (orders ?? []).filter((o) => SOLD.includes(o.status));
    return { profile, orders: orders ?? [], addresses: addresses ?? [], note: note?.note ?? "", tags: note?.tags ?? [], affiliate, reviews: reviews ?? [],
      spent: sold.reduce((s, o) => s + Number(o.total), 0), orderCount: sold.length };
  });

export const adminSaveCustomerNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), note: z.string().max(4000), tags: z.array(z.string().trim().min(1).max(40)).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context, true);
    await db.from("customer_notes").upsert({ user_id: data.id, note: data.note, tags: data.tags, updated_at: new Date().toISOString() });
    return { ok: true };
  });

export const adminExportCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db } = await guard(context, true);
    const { data } = await db.from("profiles").select("email, first_name, last_name, phone, created_at").order("created_at");
    const esc = (v: unknown) => { let t = String(v ?? ""); if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`; return `"${t.replace(/"/g, '""')}"`; };
    return ["email,first_name,last_name,phone,joined", ...(data ?? []).map((r) => [r.email, r.first_name, r.last_name, r.phone, r.created_at].map(esc).join(","))].join("\n");
  });
