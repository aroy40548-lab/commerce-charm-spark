import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const SOLD = ["paid", "confirmed", "shipped", "delivered"];
const DAY = 86_400_000;

async function guard(context: unknown) {
  const g = await import("./guard.server");
  const me = await g.requireStaff(context as never);
  return { me, db: g.db };
}

/** Who is signed in to the admin, or null when the account isn't staff. */
export const getAdminMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadStaff } = await import("./guard.server");
    return loadStaff(context as never);
  });

type OrderRow = { id: string; total: number; subtotal: number; discount: number; created_at: string; status: string; user_id: string | null; payment_method: string; discount_code: string | null; affiliate_id: string | null };

async function ordersBetween(db: Awaited<ReturnType<typeof guard>>["db"], from: Date, to: Date) {
  const out: OrderRow[] = [];
  for (let page = 0; page < 20; page++) {
    const { data, error } = await db
      .from("orders")
      .select("id, total, subtotal, discount, created_at, status, user_id, payment_method, discount_code, affiliate_id")
      .gte("created_at", from.toISOString()).lt("created_at", to.toISOString())
      .order("created_at").range(page * 1000, page * 1000 + 999);
    if (error) throw new Error(error.message);
    out.push(...(data as OrderRow[]));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
}

function byDay(orders: OrderRow[], from: Date, days: number) {
  const buckets = Array.from({ length: days }, (_, i) => {
    // Buckets start at IST midnight; label them with the IST calendar date.
    const d = new Date(from.getTime() + i * DAY + 5.5 * 3600_000);
    return { date: d.toISOString().slice(0, 10), sales: 0, orders: 0 };
  });
  for (const o of orders) {
    const i = Math.floor((new Date(o.created_at).getTime() - from.getTime()) / DAY);
    if (buckets[i] && SOLD.includes(o.status)) { buckets[i].sales += Number(o.total); buckets[i].orders += 1; }
  }
  return buckets;
}

function startOfDayIST(d: Date) {
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 5.5 * 3600_000);
}

export const getDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ days: z.number().int().min(1).max(90).default(7) }).parse(d))
  .handler(async ({ data, context }) => {
    const { me, db } = await guard(context);
    const to = new Date(startOfDayIST(new Date()).getTime() + DAY);
    const from = new Date(to.getTime() - data.days * DAY);
    const [orders, settingsRes, toFulfil, abandoned, lowStock, recent, pendingComm, reviews] = await Promise.all([
      ordersBetween(db, from, to),
      db.from("store_settings").select("low_stock_threshold").eq("id", 1).single(),
      db.from("orders").select("id", { count: "exact", head: true }).in("status", ["paid", "confirmed"]),
      db.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending").lt("created_at", new Date(Date.now() - 3600_000).toISOString()).gt("created_at", new Date(Date.now() - 7 * DAY).toISOString()),
      db.from("product_variants").select("id, title, stock, products!inner(id, title, status)").eq("products.status", "active").order("stock").limit(50),
      db.from("orders").select("id, order_number, customer_name, email, total, status, created_at").neq("status", "pending").order("created_at", { ascending: false }).limit(8),
      db.from("affiliate_commissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      db.from("product_reviews").select("id", { count: "exact", head: true }).gt("created_at", new Date(Date.now() - 7 * DAY).toISOString()),
    ]);
    const threshold = settingsRes.data?.low_stock_threshold ?? 3;
    const sold = orders.filter((o) => SOLD.includes(o.status));
    const sales = sold.reduce((s, o) => s + Number(o.total), 0);
    return {
      me,
      sales,
      orders: sold.length,
      aov: sold.length ? sales / sold.length : 0,
      customers: new Set(sold.map((o) => o.user_id).filter(Boolean)).size,
      chart: byDay(orders, from, data.days),
      toFulfil: toFulfil.count ?? 0,
      abandoned: abandoned.count ?? 0,
      pendingCommissions: pendingComm.count ?? 0,
      newReviews: reviews.count ?? 0,
      lowStock: (lowStock.data ?? []).filter((v) => v.stock <= threshold).map((v) => ({ id: v.id, productId: v.products.id, product: v.products.title, variant: v.title, stock: v.stock })),
      recent: recent.data ?? [],
    };
  });

export const getAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ days: z.number().int().min(1).max(365).default(30) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context);
    const to = new Date(startOfDayIST(new Date()).getTime() + DAY);
    const from = new Date(to.getTime() - data.days * DAY);
    const prevFrom = new Date(from.getTime() - data.days * DAY);
    const [orders, prev] = await Promise.all([ordersBetween(db, from, to), ordersBetween(db, prevFrom, from)]);
    const sold = orders.filter((o) => SOLD.includes(o.status));
    const prevSold = prev.filter((o) => SOLD.includes(o.status));
    const total = (l: OrderRow[]) => l.reduce((s, o) => s + Number(o.total), 0);
    const change = (a: number, b: number) => (b === 0 ? null : ((a - b) / b) * 100);

    const ids = sold.map((o) => o.id);
    const items: Array<{ order_id: string; title: string; product_id: string | null; quantity: number; price: number }> = [];
    for (let i = 0; i < ids.length; i += 200) {
      const { data: rows } = await db.from("order_items").select("order_id, title, product_id, quantity, price").in("order_id", ids.slice(i, i + 200));
      items.push(...(rows ?? []));
    }
    const productMap = new Map<string, { title: string; qty: number; revenue: number }>();
    for (const it of items) {
      const k = it.product_id ?? it.title;
      const cur = productMap.get(k) ?? { title: it.title, qty: 0, revenue: 0 };
      cur.qty += it.quantity; cur.revenue += Number(it.price) * it.quantity;
      productMap.set(k, cur);
    }
    const prodIds = [...productMap.keys()].filter((k) => /^[0-9a-f-]{36}$/.test(k));
    const { data: prodCats } = prodIds.length ? await db.from("products").select("id, categories(name)").in("id", prodIds) : { data: [] };
    const catOf = new Map((prodCats ?? []).map((p) => [p.id, p.categories?.name ?? "Uncategorised"]));
    const catMap = new Map<string, number>();
    for (const [k, v] of productMap) catMap.set(catOf.get(k) ?? "Uncategorised", (catMap.get(catOf.get(k) ?? "Uncategorised") ?? 0) + v.revenue);

    const group = (key: (o: OrderRow) => string | null) => {
      const m = new Map<string, { orders: number; sales: number }>();
      for (const o of sold) { const k = key(o); if (!k) continue; const c = m.get(k) ?? { orders: 0, sales: 0 }; c.orders++; c.sales += Number(o.total); m.set(k, c); }
      return [...m.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.sales - a.sales);
    };

    // Returning = customer had a sold order before this period.
    const buyers = [...new Set(sold.map((o) => o.user_id).filter(Boolean))] as string[];
    let returning = 0;
    if (buyers.length) {
      const { data: earlier } = await db.from("orders").select("user_id").in("user_id", buyers.slice(0, 500)).in("status", SOLD).lt("created_at", from.toISOString());
      returning = new Set((earlier ?? []).map((o) => o.user_id)).size;
    }

    const { data: affNames } = await db.from("affiliates").select("id, code");
    const affCode = new Map((affNames ?? []).map((a) => [a.id, a.code]));

    return {
      sales: total(sold), orders: sold.length, aov: sold.length ? total(sold) / sold.length : 0,
      salesChange: change(total(sold), total(prevSold)), ordersChange: change(sold.length, prevSold.length),
      refunded: total(orders.filter((o) => o.status === "refunded")),
      cancelled: orders.filter((o) => o.status === "cancelled").length,
      abandoned: orders.filter((o) => o.status === "pending").length,
      discountsGiven: sold.reduce((s, o) => s + Number(o.discount), 0),
      chart: byDay(orders, from, data.days),
      topProducts: [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      byCategory: [...catMap.entries()].map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales),
      byPayment: group((o) => (o.payment_method === "cod" ? "Cash on delivery" : o.payment_method === "razorpay" ? "Online (Razorpay)" : o.payment_method)),
      byDiscount: group((o) => o.discount_code),
      byAffiliate: group((o) => (o.affiliate_id ? affCode.get(o.affiliate_id) ?? "Affiliate" : null)),
      customers: { total: buyers.length, returning, new: buyers.length - returning },
    };
  });
