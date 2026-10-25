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
const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

// ---------- Products ----------
export const adminListProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ status: z.enum(["all", "active", "draft", "archived"]).default("all"), q: z.string().max(100).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context);
    let q = db.from("products")
      .select("id, handle, title, status, price, created_at, product_type, categories(name), product_images(url, position), product_variants(stock)")
      .order("created_at", { ascending: false });
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.q?.trim()) q = q.ilike("title", `%${data.q.trim().replace(/[%,()]/g, "")}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((p) => ({
      id: p.id, handle: p.handle, title: p.title, status: p.status, price: Number(p.price),
      category: p.categories?.name ?? p.product_type ?? "",
      image: [...p.product_images].sort((a, b) => a.position - b.position)[0]?.url ?? null,
      stock: p.product_variants.reduce((s, v) => s + v.stock, 0), variants: p.product_variants.length,
    }));
  });

export const adminGetProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context);
    const { data: p, error } = await db.from("products").select("*, product_images(*), product_variants(*)").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    return {
      ...p,
      product_images: [...p.product_images].sort((a, b) => a.position - b.position),
      product_variants: [...p.product_variants].sort((a, b) => a.position - b.position),
    };
  });

const productInput = z.object({
  id: uuid.optional(),
  title: z.string().trim().min(1).max(200),
  handle: z.string().trim().max(120).optional(),
  description: z.string().max(10000).default(""),
  status: z.enum(["active", "draft", "archived"]),
  category_id: uuid.nullable(),
  product_type: z.string().max(80).default(""),
  tags: z.array(z.string().max(40)).max(30).default([]),
  price: z.number().min(0),
  compare_at_price: z.number().min(0).nullable(),
  option_name: z.string().trim().min(1).max(40).default("Size"),
  seo_title: z.string().max(120).nullable().optional(),
  seo_description: z.string().max(320).nullable().optional(),
  images: z.array(z.object({ url: z.string().min(1).max(1000), alt: z.string().max(200).nullable().optional() })).max(30),
  variants: z.array(z.object({
    id: uuid.optional(),
    title: z.string().trim().min(1).max(60),
    sku: z.string().max(80).nullable().optional(),
    price: z.number().min(0).nullable(),
    compare_at_price: z.number().min(0).nullable().optional(),
    stock: z.number().int().min(0).max(100000),
  })).min(1, "Add at least one size/variant").max(100),
});

export const adminSaveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => productInput.parse(d))
  .handler(async ({ data, context }) => {
    const { me, db } = await guard(context, "products");
    const handle = slug(data.handle || data.title);
    if (!handle) throw new Error("Give the product a title");
    const row = {
      title: data.title, handle, description: data.description, status: data.status, category_id: data.category_id,
      product_type: data.product_type, tags: data.tags, price: data.price, compare_at_price: data.compare_at_price,
      option_name: data.option_name, seo_title: data.seo_title ?? null, seo_description: data.seo_description ?? null,
    };
    const { data: clash } = await db.from("products").select("id").eq("handle", handle).maybeSingle();
    if (clash && clash.id !== data.id) throw new Error(`The URL "${handle}" is already used by another product. Change the URL handle.`);

    let id = data.id;
    if (id) {
      const { error } = await db.from("products").update(row).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await db.from("products").insert(row).select("id").single();
      if (error) throw new Error(error.message);
      id = created.id;
    }

    await db.from("product_images").delete().eq("product_id", id);
    if (data.images.length) {
      const { error } = await db.from("product_images").insert(data.images.map((img, position) => ({ product_id: id!, url: img.url, alt: img.alt ?? null, position })));
      if (error) throw new Error(error.message);
    }

    const { data: existing } = await db.from("product_variants").select("id, stock").eq("product_id", id);
    const keep = new Set(data.variants.map((v) => v.id).filter(Boolean));
    const removed = (existing ?? []).filter((v) => !keep.has(v.id)).map((v) => v.id);
    if (removed.length) await db.from("product_variants").delete().in("id", removed);
    for (const [position, v] of data.variants.entries()) {
      const fields = { title: v.title, sku: v.sku ?? null, price: v.price, compare_at_price: v.compare_at_price ?? null, position };
      const prev = existing?.find((e) => e.id === v.id);
      if (prev) {
        await db.from("product_variants").update({ ...fields, stock: v.stock }).eq("id", prev.id);
        if (prev.stock !== v.stock) {
          await db.from("inventory_adjustments").insert({ variant_id: prev.id, delta: v.stock - prev.stock, stock_after: v.stock, reason: "Edited on product page", actor: me.email });
        }
      } else {
        const { data: nv, error } = await db.from("product_variants").insert({ ...fields, stock: v.stock, product_id: id! }).select("id").single();
        if (error) throw new Error(error.message);
        if (v.stock) await db.from("inventory_adjustments").insert({ variant_id: nv.id, delta: v.stock, stock_after: v.stock, reason: "Initial stock", actor: me.email });
      }
    }
    return { id: id!, handle };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context, "products");
    const { error } = await db.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDuplicateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context, "products");
    const { data: p } = await db.from("products").select("*, product_images(*), product_variants(*)").eq("id", data.id).single();
    if (!p) throw new Error("Product not found");
    const { id: _id, created_at: _c, updated_at: _u, active: _a, product_images, product_variants, ...rest } = p;
    const { data: copy, error } = await db.from("products")
      .insert({ ...rest, title: `${p.title} (copy)`, handle: `${p.handle}-copy-${Date.now().toString(36).slice(-4)}`, status: "draft" })
      .select("id").single();
    if (error) throw new Error(error.message);
    if (product_images.length) await db.from("product_images").insert(product_images.map(({ id: _i, product_id: _p, ...img }) => ({ ...img, product_id: copy.id })));
    if (product_variants.length) await db.from("product_variants").insert(product_variants.map(({ id: _i, product_id: _p, ...v }) => ({ ...v, stock: 0, product_id: copy.id })));
    return { id: copy.id };
  });

export const adminBulkProductStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ids: z.array(uuid).min(1).max(500), status: z.enum(["active", "draft", "archived"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context, "products");
    await db.from("products").update({ status: data.status }).in("id", data.ids);
    return { ok: true };
  });

// ---------- Uploads ----------
const fileInput = z.object({ type: z.string().max(100), base64: z.string().max(12_000_000), name: z.string().max(200).optional() });

export const adminUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ folder: z.enum(["products", "collections", "files", "blog"]), file: fileInput }).parse(d))
  .handler(async ({ data, context }) => {
    await guard(context, data.folder === "files" || data.folder === "blog" ? "content" : "products");
    const { uploadBase64 } = await import("@/lib/store.server");
    return uploadBase64(data.folder, data.file);
  });

// ---------- Collections ----------
export const adminListCollections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db } = await guard(context);
    const { data, error } = await db.from("categories").select("*, products(id)").order("position");
    if (error) throw new Error(error.message);
    return (data ?? []).map(({ products, ...c }) => ({ ...c, productCount: products.length }));
  });

export const adminSaveCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid.optional(), name: z.string().trim().min(1).max(80), description: z.string().max(2000).default(""), image_url: z.string().max(1000).nullable(), position: z.number().int().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context, "products");
    const row = { name: data.name, handle: slug(data.name), description: data.description, image_url: data.image_url };
    if (data.id) {
      const { error } = await db.from("categories").update(row).eq("id", data.id);
      if (error) throw new Error(error.message.includes("unique") ? "A collection with that name already exists" : error.message);
    } else {
      const { count } = await db.from("categories").select("id", { count: "exact", head: true });
      const { error } = await db.from("categories").insert({ ...row, position: data.position ?? count ?? 0 });
      if (error) throw new Error(error.message.includes("unique") ? "A collection with that name already exists" : error.message);
    }
    return { ok: true };
  });

export const adminReorderCollections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ids: z.array(uuid).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context, "products");
    await Promise.all(data.ids.map((id, position) => db.from("categories").update({ position }).eq("id", id)));
    return { ok: true };
  });

export const adminDeleteCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context, "products");
    await db.from("categories").delete().eq("id", data.id);
    return { ok: true };
  });

// ---------- Inventory ----------
export const adminInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ filter: z.enum(["all", "low", "out"]).default("all"), q: z.string().max(100).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context);
    const { data: s } = await db.from("store_settings").select("low_stock_threshold").eq("id", 1).single();
    const threshold = s?.low_stock_threshold ?? 3;
    let q = db.from("product_variants")
      .select("id, title, sku, stock, products!inner(id, title, status, product_images(url, position))")
      .neq("products.status", "archived").order("stock");
    if (data.q?.trim()) q = q.ilike("products.title", `%${data.q.trim().replace(/[%,()]/g, "")}%`);
    if (data.filter === "out") q = q.eq("stock", 0);
    if (data.filter === "low") q = q.lte("stock", threshold);
    const { data: rows, error } = await q.limit(1000);
    if (error) throw new Error(error.message);
    return {
      threshold,
      rows: (rows ?? []).map((v) => ({
        id: v.id, title: v.title, sku: v.sku, stock: v.stock, productId: v.products.id, product: v.products.title, status: v.products.status,
        image: [...v.products.product_images].sort((a, b) => a.position - b.position)[0]?.url ?? null,
      })),
    };
  });

export const adminAdjustStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ variantId: uuid, set: z.number().int().min(0).max(100000).optional(), delta: z.number().int().min(-100000).max(100000).optional(), reason: z.string().max(120).default("Manual count") }).parse(d))
  .handler(async ({ data, context }) => {
    const { me, db } = await guard(context, "products");
    let delta = data.delta ?? 0;
    if (data.set !== undefined) {
      const { data: v } = await db.from("product_variants").select("stock").eq("id", data.variantId).single();
      delta = data.set - (v?.stock ?? 0);
    }
    if (delta === 0) return { stock: data.set ?? null };
    const { data: stock, error } = await db.rpc("adjust_stock", { _variant_id: data.variantId, _delta: delta, _reason: data.reason, _actor: me.email });
    if (error) throw new Error(error.message);
    return { stock };
  });

export const adminStockHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ variantId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context);
    const { data: rows } = await db.from("inventory_adjustments").select("*").eq("variant_id", data.variantId).order("created_at", { ascending: false }).limit(50);
    return rows ?? [];
  });

// ---------- Gift cards ----------
export const adminListGiftCards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db } = await guard(context);
    const { data } = await db.from("gift_cards").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const adminSaveGiftCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: uuid.optional(), code: z.string().trim().max(40).optional(), value: z.number().min(1).max(1_000_000).optional(),
    balance: z.number().min(0).optional(), customer_email: z.string().email().nullable().optional().or(z.literal("")),
    note: z.string().max(300).default(""), expires_at: z.string().nullable().optional(), active: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context, "products");
    const common = { customer_email: data.customer_email || null, note: data.note, expires_at: data.expires_at || null, active: data.active };
    if (data.id) {
      await db.from("gift_cards").update({ ...common, ...(data.balance !== undefined ? { balance: data.balance } : {}) }).eq("id", data.id);
      return { ok: true };
    }
    if (!data.value) throw new Error("Enter the gift card value");
    const code = (data.code || `ZKGIFT-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`).toUpperCase();
    const { error } = await db.from("gift_cards").insert({ ...common, code, initial_value: data.value, balance: data.value });
    if (error) throw new Error(error.message.includes("unique") ? "That code already exists" : error.message);
    return { ok: true, code };
  });
