import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const lines = z.array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(20) })).min(1).max(50);
const address = z.object({
  full_name: z.string().min(1).max(100),
  phone: z.string().min(10).max(15),
  address1: z.string().min(1).max(200),
  address2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(80),
  state: z.string().min(1).max(80),
  pincode: z.string().regex(/^\d{6}$/, "PIN code must be 6 digits"),
  country: z.string().default("India"),
});

export const quoteCart = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ lines, code: z.string().max(40).optional().nullable() }).parse(d))
  .handler(async ({ data }) => {
    const { priceCart } = await import("./commerce.server");
    const q = await priceCart(data.lines, data.code);
    return { subtotal: q.subtotal, discount: q.discount, discountCode: q.discountCode, discountError: q.discountError, shipping: q.shipping, total: q.total };
  });

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ lines, code: z.string().max(40).optional().nullable(), address }).parse(d))
  .handler(async ({ data, context }) => {
    const { priceCart, razorpay, razorpayKeyId } = await import("./commerce.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = await priceCart(data.lines, data.code);
    const keyId = razorpayKeyId();
    const email = (context.claims as { email?: string }).email ?? "";

    const { data: order, error } = await supabaseAdmin.from("orders").insert({
      user_id: context.userId, email, subtotal: q.subtotal, discount: q.discount, shipping: q.shipping,
      total: q.total, discount_code: q.discountCode, shipping_address: data.address,
    }).select("id, order_number").single();
    if (error) throw new Error(error.message);
    const { error: ie } = await supabaseAdmin.from("order_items").insert(q.items.map((i) => ({ ...i, order_id: order.id })));
    if (ie) throw new Error(ie.message);

    const rzp = await razorpay("/orders", {
      amount: Math.round(q.total * 100), currency: "INR", receipt: `ZK${order.order_number}`, notes: { order_id: order.id },
    });
    await supabaseAdmin.from("orders").update({ razorpay_order_id: rzp.id }).eq("id", order.id);
    return { orderId: order.id, orderNumber: order.order_number, razorpayOrderId: rzp.id as string, amount: rzp.amount as number, keyId, email };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid(), razorpay_order_id: z.string(), razorpay_payment_id: z.string(), razorpay_signature: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { verifyPaymentSignature } = await import("./commerce.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("id, user_id, razorpay_order_id").eq("id", data.orderId).single();
    if (!order || order.user_id !== context.userId || order.razorpay_order_id !== data.razorpay_order_id) throw new Error("Order not found");
    if (!verifyPaymentSignature(data.razorpay_order_id, data.razorpay_payment_id, data.razorpay_signature)) throw new Error("Payment could not be verified");
    await supabaseAdmin.rpc("mark_order_paid", { _order_id: order.id, _payment_id: data.razorpay_payment_id });
    return { ok: true };
  });
