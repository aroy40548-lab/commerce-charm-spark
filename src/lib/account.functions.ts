import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { addressSchema } from "@/lib/checkout.functions";

async function db() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

export const getMyOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await db();
    const { data, error } = await sb
      .from("orders")
      .select("id, order_number, status, payment_method, total, created_at, courier_name, awb_code, tracking_url, tracking_status, shipping_method, order_items(title, variant_title, quantity, image_url, price, product_id)")
      .eq("user_id", context.userId)
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const ids = [...new Set((data ?? []).flatMap((o) => o.order_items.map((i) => i.product_id)).filter(Boolean))] as string[];
    const { data: prods } = ids.length ? await sb.from("products").select("id, handle").in("id", ids) : { data: [] };
    const handle = new Map((prods ?? []).map((p) => [p.id, p.handle]));
    return (data ?? []).map((o) => ({ ...o, order_items: o.order_items.map((i) => ({ ...i, handle: i.product_id ? handle.get(i.product_id) ?? null : null })) }));
  });

export const getMyOrderCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await db();
    const { count } = await sb.from("orders").select("id", { count: "exact", head: true })
      .eq("user_id", context.userId).in("status", ["paid", "confirmed", "shipped", "delivered", "refunded"]);
    return count ?? 0;
  });

export const getMyAddresses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await db();
    const { data } = await sb.from("addresses").select("*").eq("user_id", context.userId).order("is_default", { ascending: false }).order("created_at", { ascending: false });
    return data ?? [];
  });

export const deleteMyAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    await sb.from("addresses").delete().eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

export const saveMyAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid().optional(), address: addressSchema, isDefault: z.boolean().default(false) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    if (data.isDefault) await sb.from("addresses").update({ is_default: false }).eq("user_id", context.userId);
    const row = { ...data.address, address2: data.address.address2 ?? null, user_id: context.userId, is_default: data.isDefault };
    const res = data.id
      ? await sb.from("addresses").update(row).eq("id", data.id).eq("user_id", context.userId)
      : await sb.from("addresses").insert(row);
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });

// ---------- Wishlist (saved by product handle in the browser) ----------
export const getMyWishlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await db();
    const { data, error } = await sb.from("wishlists").select("products(handle)").eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.products?.handle).filter(Boolean) as string[];
  });

export const setMyWishlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ handles: z.array(z.string().min(1).max(255)).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    const handles = [...new Set(data.handles)];
    const { data: prods } = handles.length ? await sb.from("products").select("id").in("handle", handles) : { data: [] };
    await sb.from("wishlists").delete().eq("user_id", context.userId);
    if (prods?.length) {
      const { error } = await sb.from("wishlists").insert(prods.map((p) => ({ user_id: context.userId, product_id: p.id })));
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
