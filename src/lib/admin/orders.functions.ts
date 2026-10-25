import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Section } from "./permissions";

async function guard(context: unknown, section?: Section) {
  const g = await import("./guard.server");
  const me = await g.requireStaff(context as never, section);
  return { me, db: g.db, log: g.logOrderEvent };
}

const uuid = z.string().uuid();

export const listOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      view: z.enum(["all", "unfulfilled", "shipped", "delivered", "cod", "cancelled", "refunded", "drafts", "abandoned"]).default("all"),
      q: z.string().max(100).optional(),
      page: z.number().int().min(0).default(0),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { db } = await guard(context);
    let query = db.from("orders")
      .select("id, order_number, created_at, customer_name, email, phone, total, status, payment_method, source, shipping_method, order_items(quantity)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.page * 50, data.page * 50 + 49);
    const v = data.view;
    if (v === "abandoned") query = query.eq("status", "pending").lt("created_at", new Date(Date.now() - 3600_000).toISOString());
    else if (v === "drafts") query = query.eq("source", "draft");
    else if (v === "unfulfilled") query = query.in("status", ["paid", "confirmed"]);
    else if (v === "cod") query = query.eq("payment_method", "cod").neq("status", "pending");
    else if (v !== "all") query = query.eq("status", v);
    else query = query.neq("status", "pending");
    const q = data.q?.trim();
    if (q) {
      const n = Number(q.replace(/^zk/i, ""));
      query = Number.isInteger(n) && n > 0
        ? query.eq("order_number", n)
        : query.or(`email.ilike.%${q.replace(/[%,()]/g, "")}%,customer_name.ilike.%${q.replace(/[%,()]/g, "")}%,phone.ilike.%${q.replace(/[%,()]/g, "")}%`);
    }
    const { data: rows, count, error } = await query;
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []).map((r) => ({ ...r, items: r.order_items.reduce((s, i) => s + i.quantity, 0) })), count: count ?? 0 };
  });

export const getOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context);
    const { data: o, error } = await db.from("orders").select("*, order_items(*), order_events(*)").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const [{ data: commission }, { data: affiliate }, { count: customerOrders }] = await Promise.all([
      db.from("affiliate_commissions").select("*").eq("order_id", o.id).maybeSingle(),
      o.affiliate_id ? db.from("affiliates").select("id, code, name, email").eq("id", o.affiliate_id).maybeSingle() : Promise.resolve({ data: null }),
      o.user_id ? db.from("orders").select("id", { count: "exact", head: true }).eq("user_id", o.user_id).neq("status", "pending") : Promise.resolve({ count: 0 }),
    ]);
    return {
      ...o,
      order_events: [...o.order_events].sort((a, b) => a.created_at.localeCompare(b.created_at)),
      commission, affiliate, customerOrders: customerOrders ?? 0,
    };
  });

export const addOrderNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid, note: z.string().trim().min(1).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { me, log } = await guard(context, "orders");
    await log(data.id, data.note, me.email, "note");
    return { ok: true };
  });

export const orderAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.discriminatedUnion("action", [
      z.object({ action: z.literal("mark_paid"), id: uuid }),
      z.object({ action: z.literal("fulfill"), id: uuid, courier: z.string().trim().min(1).max(80), awb: z.string().trim().max(80).optional(), url: z.string().trim().url().max(500).optional().or(z.literal("")) }),
      z.object({ action: z.literal("shiprocket"), id: uuid }),
      z.object({ action: z.literal("refresh_tracking"), id: uuid }),
      z.object({ action: z.literal("deliver"), id: uuid }),
      z.object({ action: z.literal("cancel"), id: uuid, reason: z.string().trim().max(300).default("") }),
      z.object({ action: z.literal("refund"), id: uuid, reason: z.string().trim().max(300).default(""), viaRazorpay: z.boolean().default(true) }),
    ]).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { me, db, log } = await guard(context, "orders");
    const { data: o } = await db.from("orders").select("*, order_items(*)").eq("id", data.id).single();
    if (!o) throw new Error("Order not found");
    const { sendOrderEmail } = await import("@/lib/email.server");
    const now = new Date().toISOString();

    switch (data.action) {
      case "mark_paid": {
        if (o.status === "pending") await db.rpc("commit_order", { _order_id: o.id, _payment_id: null as unknown as string, _status: "paid" });
        else await db.from("orders").update({ paid_at: now }).eq("id", o.id);
        await log(o.id, o.payment_method === "cod" ? "Cash collected" : "Marked as paid", me.email, "paid");
        return { ok: true };
      }
      case "fulfill": {
        if (!["paid", "confirmed", "shipped"].includes(o.status)) throw new Error("Only confirmed orders can be shipped");
        await db.from("orders").update({
          status: "shipped", courier_name: data.courier, awb_code: data.awb || null, tracking_url: data.url || null,
          tracking_status: "Shipped", shipped_at: o.shipped_at ?? now,
        }).eq("id", o.id);
        await log(o.id, `Shipped with ${data.courier}${data.awb ? ` · ${data.awb}` : ""}`, me.email, "shipped");
        await sendOrderEmail(o.id, "shipped");
        return { ok: true };
      }
      case "shiprocket": {
        if (!["paid", "confirmed"].includes(o.status)) throw new Error("Only confirmed orders can be shipped");
        const { shiprocket, getSettings } = await import("@/lib/store.server");
        const s = await getSettings();
        const a = o.shipping_address as Record<string, string>;
        const [first, ...rest] = (a["full_name"] ?? o.customer_name ?? "").split(" ");
        const created = await shiprocket("/orders/create/adhoc", "POST", {
          order_id: `ZK${o.order_number}`,
          order_date: new Date(o.created_at).toISOString().slice(0, 16).replace("T", " "),
          pickup_location: s.pickup_location,
          billing_customer_name: first, billing_last_name: rest.join(" ") || ".",
          billing_address: a["address1"], billing_address_2: a["address2"] ?? "",
          billing_city: a["city"], billing_pincode: a["pincode"], billing_state: a["state"], billing_country: "India",
          billing_email: o.email, billing_phone: a["phone"] ?? o.phone, shipping_is_billing: true,
          order_items: o.order_items.map((i) => ({ name: `${i.title} ${i.variant_title ?? ""}`.trim(), sku: i.sku ?? i.variant_id ?? i.title, units: i.quantity, selling_price: Number(i.price) })),
          payment_method: o.payment_method === "cod" ? "COD" : "Prepaid",
          sub_total: Number(o.total),
          length: 30, breadth: 25, height: 5, weight: Number(s.package_weight_kg),
        });
        let awb: string | null = null, courier: string | null = null;
        try {
          const assign = await shiprocket("/courier/assign/awb", "POST", { shipment_id: created.shipment_id });
          awb = assign?.response?.data?.awb_code ?? null;
          courier = assign?.response?.data?.courier_name ?? null;
        } catch { /* AWB can be assigned later from Shiprocket */ }
        await db.from("orders").update({
          status: "shipped", shiprocket_order_id: String(created.order_id), shiprocket_shipment_id: String(created.shipment_id),
          awb_code: awb, courier_name: courier ?? "Shiprocket", tracking_url: awb ? `https://shiprocket.co/tracking/${awb}` : null,
          tracking_status: awb ? "AWB assigned" : "Shipment created", shipped_at: now,
        }).eq("id", o.id);
        await log(o.id, `Shiprocket shipment created${awb ? ` · AWB ${awb} (${courier})` : ""}`, me.email, "shipped");
        if (awb) await sendOrderEmail(o.id, "shipped");
        return { ok: true, awb, courier };
      }
      case "refresh_tracking": {
        if (!o.awb_code) throw new Error("No tracking number yet");
        const { shiprocket } = await import("@/lib/store.server");
        const t = await shiprocket(`/courier/track/awb/${o.awb_code}`, "GET");
        const status: string = t?.tracking_data?.shipment_track?.[0]?.current_status ?? "Unknown";
        const delivered = status.toLowerCase() === "delivered";
        await db.from("orders").update({ tracking_status: status, ...(delivered ? { status: "delivered", delivered_at: now } : {}) }).eq("id", o.id);
        if (delivered && o.status !== "delivered") { await log(o.id, "Delivered (courier update)", "system", "delivered"); await sendOrderEmail(o.id, "delivered"); }
        return { ok: true, status };
      }
      case "deliver": {
        await db.from("orders").update({ status: "delivered", delivered_at: now, tracking_status: "Delivered", ...(o.payment_method === "cod" && !o.paid_at ? { paid_at: now } : {}) }).eq("id", o.id);
        await log(o.id, o.payment_method === "cod" ? "Delivered · cash collected" : "Marked delivered", me.email, "delivered");
        await sendOrderEmail(o.id, "delivered");
        return { ok: true };
      }
      case "cancel": {
        if (["shipped", "delivered"].includes(o.status)) throw new Error("This order has shipped. Use Refund instead.");
        await db.rpc("release_order", { _order_id: o.id, _status: "cancelled", _reason: data.reason, _actor: me.email });
        if (o.razorpay_payment_id && o.status === "paid") {
          await log(o.id, "Payment was online — use Refund to return the money.", "system");
        }
        await sendOrderEmail(o.id, "cancelled");
        return { ok: true };
      }
      case "refund": {
        let refundId: string | null = null;
        if (data.viaRazorpay && o.razorpay_payment_id) {
          const { razorpay } = await import("@/lib/store.server");
          const r = await razorpay(`/payments/${o.razorpay_payment_id}/refund`, { amount: Math.round(Number(o.total) * 100) });
          refundId = r.id;
        }
        await db.rpc("release_order", { _order_id: o.id, _status: "refunded", _reason: data.reason, _actor: me.email });
        if (refundId) await db.from("orders").update({ refund_id: refundId }).eq("id", o.id);
        await log(o.id, refundId ? `Razorpay refund ${refundId} for ₹${o.total}` : "Refund recorded (paid back outside Razorpay)", me.email, "refunded");
        return { ok: true };
      }
    }
  });

/** Manual order (WhatsApp/Instagram/phone sales). */
export const createDraftOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      email: z.string().trim().email(),
      address: z.object({
        full_name: z.string().trim().min(2).max(100), phone: z.string().trim().min(10).max(15),
        address1: z.string().trim().min(3).max(200), address2: z.string().trim().max(200).optional().nullable(),
        city: z.string().trim().min(2).max(80), state: z.string().trim().min(2).max(80),
        pincode: z.string().trim().regex(/^\d{6}$/), country: z.string().default("India"),
      }),
      lines: z.array(z.object({ variantId: uuid, quantity: z.number().int().min(1).max(50), price: z.number().min(0).optional() })).min(1).max(50),
      discount: z.number().min(0).default(0),
      shipping: z.number().min(0).default(0),
      payment: z.enum(["paid", "cod", "pending"]),
      note: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { me, db, log } = await guard(context, "orders");
    const { data: variants, error } = await db.from("product_variants")
      .select("id, title, sku, stock, price, products!inner(id, title, price, product_images(url, position))").in("id", data.lines.map((l) => l.variantId));
    if (error) throw new Error(error.message);
    const items = data.lines.map((l) => {
      const v = variants?.find((x) => x.id === l.variantId);
      if (!v) throw new Error("A product in this order no longer exists");
      if (data.payment !== "pending" && v.stock < l.quantity) throw new Error(`Only ${v.stock} left of ${v.products.title} (${v.title})`);
      return {
        product_id: v.products.id, variant_id: v.id, title: v.products.title, variant_title: v.title, sku: v.sku,
        image_url: [...v.products.product_images].sort((a, b) => a.position - b.position)[0]?.url ?? null,
        price: l.price ?? Number(v.price ?? v.products.price), quantity: l.quantity,
      };
    });
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const discount = Math.min(data.discount, subtotal);
    const { data: profile } = await db.from("profiles").select("id").ilike("email", data.email).maybeSingle();
    const { data: order, error: oe } = await db.from("orders").insert({
      user_id: profile?.id ?? null, email: data.email.toLowerCase(),
      customer_name: data.address.full_name, phone: data.address.phone, shipping_address: data.address,
      subtotal, discount, shipping: data.shipping, total: subtotal - discount + data.shipping,
      payment_method: data.payment === "cod" ? "cod" : "manual", source: "draft", customer_note: data.note || null,
    }).select("id, order_number").single();
    if (oe) throw new Error(oe.message);
    await db.from("order_items").insert(items.map((i) => ({ ...i, order_id: order.id })));
    await log(order.id, `Order created by ${me.name} in the admin`, me.email, "created");
    if (data.payment !== "pending") {
      await db.rpc("commit_order", { _order_id: order.id, _payment_id: null as unknown as string, _status: data.payment === "paid" ? "paid" : "confirmed" });
    }
    return { id: order.id, number: `ZK${order.order_number}` };
  });

export const deleteAbandoned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context, "orders");
    await db.from("orders").delete().eq("id", data.id).eq("status", "pending");
    return { ok: true };
  });

export const searchVariants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ q: z.string().max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await guard(context);
    const { data: rows } = await db.from("products")
      .select("id, title, price, product_images(url, position), product_variants(id, title, stock, price, position)")
      .ilike("title", `%${data.q.replace(/[%,()]/g, "")}%`).neq("status", "archived").limit(10);
    return (rows ?? []).flatMap((p) =>
      [...p.product_variants].sort((a, b) => a.position - b.position).map((v) => ({
        variantId: v.id, product: p.title, variant: v.title, stock: v.stock, price: Number(v.price ?? p.price),
        image: [...p.product_images].sort((a, b) => a.position - b.position)[0]?.url ?? null,
      })),
    );
  });
