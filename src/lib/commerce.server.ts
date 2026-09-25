import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CartLine = { variantId: string; quantity: number };

export async function priceCart(lines: CartLine[], code?: string | null) {
  const ids = lines.map((l) => l.variantId);
  const { data: variants, error } = await supabaseAdmin
    .from("product_variants")
    .select("id, title, stock, price, products!inner(id, title, price, active, product_images(url, position))")
    .in("id", ids);
  if (error) throw new Error(error.message);
  const { data: settings } = await supabaseAdmin.from("store_settings").select("*").eq("id", 1).single();

  const items = lines.map((l) => {
    const v = variants?.find((x) => x.id === l.variantId);
    if (!v || !v.products.active) throw new Error("An item in your bag is no longer available.");
    if (v.stock < l.quantity) throw new Error(`${v.products.title} (${v.title}) has only ${v.stock} left.`);
    const img = [...v.products.product_images].sort((a, b) => a.position - b.position)[0]?.url ?? null;
    return {
      product_id: v.products.id,
      variant_id: v.id,
      title: v.products.title,
      variant_title: v.title,
      image_url: img,
      price: Number(v.price ?? v.products.price),
      quantity: Math.max(1, Math.floor(l.quantity)),
    };
  });
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  let discount = 0;
  let discountCode: string | null = null;
  let discountError: string | null = null;
  if (code) {
    const { data: d } = await supabaseAdmin.from("discounts").select("*").eq("code", code.trim().toUpperCase()).maybeSingle();
    if (!d || !d.active) discountError = "That code isn't valid.";
    else if (d.expires_at && new Date(d.expires_at) < new Date()) discountError = "That code has expired.";
    else if (d.usage_limit != null && d.used_count >= d.usage_limit) discountError = "That code has been fully used.";
    else if (subtotal < Number(d.min_order)) discountError = `Minimum order for this code is ₹${d.min_order}.`;
    else {
      discount = d.kind === "percent" ? Math.round((subtotal * Number(d.value)) / 100) : Math.min(Number(d.value), subtotal);
      discountCode = d.code;
    }
  }
  const after = subtotal - discount;
  const shipping = settings && after < Number(settings.free_shipping_over) ? Number(settings.shipping_fee) : 0;
  return { items, subtotal, discount, discountCode, discountError, shipping, total: after + shipping };
}

function rzpAuth() {
  const id = process.env["RAZORPAY_KEY_ID"];
  const secret = process.env["RAZORPAY_KEY_SECRET"];
  if (!id || !secret) throw new Error("Online payment isn't set up yet. Please try again later.");
  return { id, secret, header: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64") };
}

export async function razorpay(path: string, body: unknown) {
  const { header } = rzpAuth();
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: "POST",
    headers: { Authorization: header, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.description ?? "Razorpay request failed");
  return json;
}

export function razorpayKeyId() { return rzpAuth().id; }

export function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const expected = createHmac("sha256", rzpAuth().secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

export function verifyWebhookSignature(body: string, signature: string) {
  const secret = process.env["RAZORPAY_WEBHOOK_SECRET"];
  if (!secret) return false;
  return safeEqualHex(createHmac("sha256", secret).update(body).digest("hex"), signature);
}

// ---------- Shiprocket ----------
let srToken: { token: string; at: number } | null = null;
async function shiprocketToken() {
  if (srToken && Date.now() - srToken.at < 8 * 24 * 3600 * 1000) return srToken.token;
  const email = process.env["SHIPROCKET_EMAIL"], password = process.env["SHIPROCKET_PASSWORD"];
  if (!email || !password) throw new Error("Shiprocket isn't connected yet. Add your Shiprocket API login first.");
  const res = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok || !json.token) throw new Error(json?.message ?? "Shiprocket login failed");
  srToken = { token: json.token, at: Date.now() };
  return json.token as string;
}

export async function shiprocket(path: string, method: "GET" | "POST", body?: unknown) {
  const token = await shiprocketToken();
  const res = await fetch(`https://apiv2.shiprocket.in/v1/external${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message ?? `Shiprocket error ${res.status}`);
  return json;
}
