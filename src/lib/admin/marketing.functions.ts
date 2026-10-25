import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Section } from "./permissions";

async function guard(context: unknown, section?: Section) {
  const g = await import("./guard.server");
  const me = await g.requireStaff(context as never, section);
  return { me, db: g.db };
}
const uuid = z.string().uuid();

// ---------- Discounts ----------
export const adminListDiscounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db } = await guard(context);
    const { data } = await db.from("discounts").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const adminSaveDiscount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: uuid.optional(),
    code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, - or _"),
    description: z.string().max(200).default(""),
    kind: z.enum(["percent", "fixed", "free_shipping"]),
    value: z.number().min(0).max(1_000_000),
    min_order: z.number().min(0).default(0),
    starts_at: z.string().nullable().optional(),
    expires_at: z.string().nullable().optional(),
    usage_limit: z.number().int().min(1).nullable().optional(),
    first_order_only: z.boolean().default(false),
    once_per_customer: z.boolean().default(false),
    active: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context, "discounts");
    if (data.kind === "percent" && data.value > 100) throw new Error("A percentage can't be more than 100");
    const { id, ...row } = { ...data, code: data.code.toUpperCase(), starts_at: data.starts_at || null, expires_at: data.expires_at || null, usage_limit: data.usage_limit ?? null };
    const res = id ? await db.from("discounts").update(row).eq("id", id) : await db.from("discounts").insert(row);
    if (res.error) throw new Error(res.error.message.includes("unique") ? "That code already exists" : res.error.message);
    return { ok: true };
  });

export const adminDeleteDiscount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context, "discounts");
    await db.from("discounts").delete().eq("id", data.id);
    return { ok: true };
  });

// ---------- Affiliates ----------
export const adminListAffiliates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db } = await guard(context);
    const [{ data: affs }, { data: comms }, { data: settings }] = await Promise.all([
      db.from("affiliates").select("*").order("created_at", { ascending: false }),
      db.from("affiliate_commissions").select("affiliate_id, amount, order_amount, status"),
      db.from("store_settings").select("affiliate_rate, affiliates_enabled").eq("id", 1).single(),
    ]);
    return {
      defaultRate: Number(settings?.affiliate_rate ?? 5),
      enabled: settings?.affiliates_enabled ?? true,
      affiliates: (affs ?? []).map((a) => {
        const mine = (comms ?? []).filter((c) => c.affiliate_id === a.id);
        const sum = (s: string) => mine.filter((c) => c.status === s).reduce((t, c) => t + Number(c.amount), 0);
        return { ...a, orders: mine.filter((c) => c.status !== "rejected").length, sales: mine.filter((c) => c.status !== "rejected").reduce((t, c) => t + Number(c.order_amount), 0),
          pending: sum("pending"), approved: sum("approved"), paid: sum("paid") };
      }),
    };
  });

export const adminUpdateAffiliate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid, status: z.enum(["active", "suspended"]).optional(), commission_rate: z.number().min(0).max(50).nullable().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context, "marketing");
    await db.from("affiliates").update({
      ...(data.status ? { status: data.status } : {}),
      ...(data.commission_rate !== undefined ? { commission_rate: data.commission_rate } : {}),
    }).eq("id", data.id);
    return { ok: true };
  });

export const adminListCommissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ status: z.enum(["pending", "approved", "paid", "rejected", "all"]).default("pending") }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context);
    let q = db.from("affiliate_commissions")
      .select("*, affiliates(code, name, email, payout_upi), orders(id, order_number, status, customer_name, created_at)")
      .order("created_at", { ascending: false }).limit(500);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminDecideCommissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ids: z.array(uuid).min(1).max(500), decision: z.enum(["approved", "rejected", "paid"]), note: z.string().max(300).default("") }).parse(d))
  .handler(async ({ data, context }) => {
    const { me, db } = await guard(context, "marketing");
    const now = new Date().toISOString();
    // Only legal moves: pending → approved/rejected, approved → paid/rejected.
    const from = data.decision === "paid" ? ["approved"] : ["pending", "approved"];
    const patch = data.decision === "paid"
      ? { status: "paid", paid_at: now }
      : { status: data.decision, decided_by: me.email, decided_at: now, ...(data.note ? { note: data.note } : {}) };
    const { data: rows, error } = await db.from("affiliate_commissions").update(patch).in("id", data.ids).in("status", from).select("id");
    if (error) throw new Error(error.message);
    return { updated: rows?.length ?? 0 };
  });

// ---------- Reviews ----------
export const adminListReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ filter: z.enum(["all", "visible", "hidden", "low", "photos", "unanswered"]).default("all") }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context);
    let q = db.from("product_reviews").select("*").order("created_at", { ascending: false }).limit(500);
    if (data.filter === "hidden") q = q.eq("hidden", true);
    if (data.filter === "visible") q = q.eq("hidden", false);
    if (data.filter === "low") q = q.lte("rating", 2);
    if (data.filter === "unanswered") q = q.is("admin_reply", null);
    const { data: rows } = await q;
    const list = (rows ?? []).filter((r) => data.filter !== "photos" || (r.photo_paths?.length ?? 0) > 0);
    const paths = list.flatMap((r) => r.photo_paths ?? []);
    const { data: signed } = paths.length ? await db.storage.from("review-photos").createSignedUrls(paths, 3600) : { data: [] };
    const url = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
    const { data: prods } = await db.from("products").select("handle, title").in("handle", [...new Set(list.map((r) => r.product_handle))]);
    const title = new Map((prods ?? []).map((p) => [p.handle, p.title]));
    return list.map((r) => ({ ...r, product: title.get(r.product_handle) ?? r.product_handle, pictures: (r.photo_paths ?? []).map((p) => url.get(p)).filter(Boolean) as string[] }));
  });

export const adminModerateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.discriminatedUnion("action", [
    z.object({ action: z.literal("hide"), id: uuid, hidden: z.boolean() }),
    z.object({ action: z.literal("reply"), id: uuid, reply: z.string().trim().max(1000) }),
    z.object({ action: z.literal("delete"), id: uuid }),
  ]).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context, "reviews");
    if (data.action === "hide") await db.from("product_reviews").update({ hidden: data.hidden }).eq("id", data.id);
    if (data.action === "reply") await db.from("product_reviews").update({ admin_reply: data.reply || null, replied_at: data.reply ? new Date().toISOString() : null }).eq("id", data.id);
    if (data.action === "delete") {
      const { data: row } = await db.from("product_reviews").delete().eq("id", data.id).select("photo_paths").maybeSingle();
      if (row?.photo_paths?.length) await db.storage.from("review-photos").remove(row.photo_paths);
    }
    return { ok: true };
  });

// ---------- Content: files & blog ----------
export const adminListFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db } = await guard(context);
    const folders = ["files", "products", "collections", "blog"];
    const all = await Promise.all(folders.map(async (f) => {
      const { data } = await db.storage.from("product-images").list(f, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
      return (data ?? []).filter((x) => x.id).map((x) => ({
        path: `${f}/${x.name}`, name: x.name, folder: f, url: `/api/public/img/${f}/${x.name}`,
        size: (x.metadata as { size?: number } | null)?.size ?? 0, type: (x.metadata as { mimetype?: string } | null)?.mimetype ?? "", created: x.created_at,
      }));
    }));
    return all.flat().sort((a, b) => (b.created ?? "").localeCompare(a.created ?? ""));
  });

export const adminDeleteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ path: z.string().regex(/^(files|products|collections|blog)\/[\w\-.]+$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context, "content");
    await db.storage.from("product-images").remove([data.path]);
    return { ok: true };
  });

export const adminListPosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db } = await guard(context);
    const { data } = await db.from("blog_posts").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const adminSavePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: uuid.optional(), title: z.string().trim().min(1).max(200), slug: z.string().trim().max(120).optional(),
    excerpt: z.string().max(400).default(""), body: z.string().max(50000).default(""), cover_url: z.string().max(1000).nullable(),
    author: z.string().max(80).default("ZANKYO"), published: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context, "content");
    const slug = (data.slug || data.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 100);
    const { data: prev } = data.id ? await db.from("blog_posts").select("published_at").eq("id", data.id).single() : { data: null };
    const row = { title: data.title, slug, excerpt: data.excerpt, body: data.body, cover_url: data.cover_url, author: data.author, published: data.published,
      published_at: data.published ? prev?.published_at ?? new Date().toISOString() : prev?.published_at ?? null };
    const res = data.id ? await db.from("blog_posts").update(row).eq("id", data.id) : await db.from("blog_posts").insert(row);
    if (res.error) throw new Error(res.error.message.includes("unique") ? "Another post already uses that URL" : res.error.message);
    return { ok: true, slug };
  });

export const adminDeletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context, "content");
    await db.from("blog_posts").delete().eq("id", data.id);
    return { ok: true };
  });
