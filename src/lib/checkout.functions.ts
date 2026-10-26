import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const lines = z.array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(20) })).min(1).max(50);
const options = {
  code: z.string().max(40).optional().nullable(),
  giftCard: z.string().max(40).optional().nullable(),
  shipping: z.enum(["standard", "express"]).default("standard"),
  payment: z.enum(["razorpay", "cod"]).default("razorpay"),
};
export const addressSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"),
  address1: z.string().trim().min(3, "Enter your address").max(200),
  address2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().min(2, "Enter your city").max(80),
  state: z.string().trim().min(2, "Enter your state").max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, "PIN code must be 6 digits"),
  country: z.string().default("India"),
});
export type Address = z.infer<typeof addressSchema>;

export const getCheckoutConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { getSettings, razorpayConfigured } = await import("./store.server");
  const s = await getSettings();
  return {
    standard: { label: s.standard_label, fee: Number(s.shipping_fee), freeOver: Number(s.free_shipping_over) },
    express: s.express_enabled ? { label: s.express_label, fee: Number(s.express_shipping_fee) } : null,
    cod: s.cod_enabled ? { fee: Number(s.cod_fee) } : null,
    online: razorpayConfigured(),
  };
});

export const quoteCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ lines, ...options }).parse(d))
  .handler(async ({ data, context }) => {
    const { priceCart } = await import("./store.server");
    const q = await priceCart(data.lines, { ...data, userId: context.userId });
    const { items: _items, ...totals } = q;
    return totals;
  });

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      lines, ...options,
      address: addressSchema,
      note: z.string().max(500).optional().nullable(),
      affiliateCode: z.string().max(40).optional().nullable(),
      affiliateProducts: z.array(z.string().max(255)).max(20).default([]),
      affiliateReel: z.string().uuid().optional().nullable(),
      saveAddress: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { priceCart, razorpay, razorpayKeyId, razorpayConfigured } = await import("./store.server");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const q = await priceCart(data.lines, { ...data, userId: context.userId });
    if (q.discountError) throw new Error(q.discountError);
    if (q.giftCardError) throw new Error(q.giftCardError);
    if (data.payment === "razorpay" && q.total > 0 && !razorpayConfigured()) {
      throw new Error("Online payment isn't switched on yet. Please choose cash on delivery or try again later.");
    }
    const email = String((context.claims as { email?: string }).email ?? "");

    let affiliateId: string | null = null;
    let affiliateProductIds: string[] = [];
    let reelId: string | null = null;
    if (data.affiliateCode) {
      const { data: a } = await db.from("affiliates").select("id, user_id").eq("code", data.affiliateCode.toUpperCase()).eq("status", "active").maybeSingle();
      if (a && a.user_id !== context.userId) {
        affiliateId = a.id;
        // Commission only counts the products this affiliate's link or reel pointed to.
        const ids = new Set<string>();
        if (data.affiliateProducts.length) {
          const { data: ps } = await db.from("products").select("id").in("handle", data.affiliateProducts);
          ps?.forEach((p) => ids.add(p.id));
        }
        if (data.affiliateReel) {
          const { data: reel } = await db.from("reels").select("id, user_id, reel_products(product_id)").eq("id", data.affiliateReel).maybeSingle();
          if (reel && reel.user_id === a.user_id) {
            reelId = reel.id;
            reel.reel_products.forEach((rp) => ids.add(rp.product_id));
          }
        }
        affiliateProductIds = [...ids];
      }
    }

    const { data: order, error } = await db.from("orders").insert({
      user_id: context.userId, email,
      customer_name: data.address.full_name, phone: data.address.phone,
      subtotal: q.subtotal, discount: q.discount, shipping: q.shipping, cod_fee: q.codFee,
      gift_card_code: q.giftCardCode, gift_card_amount: q.giftCardAmount,
      total: q.total, discount_code: q.discountCode, shipping_address: data.address,
      shipping_method: q.shippingMethod, payment_method: q.total === 0 ? "gift_card" : data.payment,
      affiliate_id: affiliateId, affiliate_product_ids: affiliateProductIds, reel_id: reelId, customer_note: data.note || null,
    }).select("id, order_number").single();
    if (error) throw new Error(error.message);
    const { error: ie } = await db.from("order_items").insert(q.items.map((i) => ({ ...i, order_id: order.id })));
    if (ie) throw new Error(ie.message);
    await db.from("order_events").insert({ order_id: order.id, kind: "created", message: "Order placed on the website", actor: email });

    if (data.saveAddress) {
      const { data: existing } = await db.from("addresses").select("id").eq("user_id", context.userId)
        .eq("address1", data.address.address1).eq("pincode", data.address.pincode).maybeSingle();
      if (!existing) {
        const { count } = await db.from("addresses").select("id", { count: "exact", head: true }).eq("user_id", context.userId);
        await db.from("addresses").insert({ ...data.address, address2: data.address.address2 ?? null, user_id: context.userId, is_default: !count });
      }
    }

    const number = `ZK${order.order_number}`;
    if (q.total === 0 || data.payment === "cod") {
      await db.rpc("commit_order", { _order_id: order.id, _payment_id: null as unknown as string, _status: q.total === 0 ? "paid" : "confirmed" });
      const { sendOrderEmail } = await import("./email.server");
      await sendOrderEmail(order.id, "confirmed");
      return { kind: "done" as const, orderId: order.id, orderNumber: number };
    }

    const rzp = await razorpay("/orders", {
      amount: Math.round(q.total * 100), currency: "INR", receipt: number, notes: { order_id: order.id },
    });
    await db.from("orders").update({ razorpay_order_id: rzp.id }).eq("id", order.id);
    return {
      kind: "razorpay" as const, orderId: order.id, orderNumber: number,
      razorpayOrderId: rzp.id as string, amount: rzp.amount as number, keyId: razorpayKeyId(),
      email, name: data.address.full_name, phone: data.address.phone,
    };
  });

export const confirmPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid(), razorpay_order_id: z.string().max(100), razorpay_payment_id: z.string().max(100), razorpay_signature: z.string().max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { verifyPaymentSignature } = await import("./store.server");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: order } = await db.from("orders").select("id, user_id, razorpay_order_id, status").eq("id", data.orderId).single();
    if (!order || order.user_id !== context.userId || order.razorpay_order_id !== data.razorpay_order_id) throw new Error("Order not found");
    if (!verifyPaymentSignature(data.razorpay_order_id, data.razorpay_payment_id, data.razorpay_signature)) throw new Error("Payment could not be verified");
    const firstTime = order.status === "pending";
    await db.rpc("commit_order", { _order_id: order.id, _payment_id: data.razorpay_payment_id, _status: "paid" });
    if (firstTime) {
      const { sendOrderEmail } = await import("./email.server");
      await sendOrderEmail(order.id, "confirmed");
    }
    return { ok: true };
  });
