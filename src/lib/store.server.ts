import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CartLine = { variantId: string; quantity: number };
export type ShippingMethod = "standard" | "express";
export type PaymentMethod = "razorpay" | "cod";

export async function getSettings() {
  const { data, error } = await supabaseAdmin.from("store_settings").select("*").eq("id", 1).single();
  if (error) throw new Error(error.message);
  return data;
}

// Orders that actually went through (not abandoned, not cancelled).
const COUNTED = ["paid", "confirmed", "shipped", "delivered", "refunded"];

export async function priceCart(
  lines: CartLine[],
  opts: { code?: string | null | undefined; giftCard?: string | null | undefined; shipping?: ShippingMethod | undefined; payment?: PaymentMethod | undefined; userId?: string | null | undefined },
) {
  const ids = lines.map((l) => l.variantId);
  const [{ data: variants, error }, settings] = await Promise.all([
    supabaseAdmin
      .from("product_variants")
      .select("id, title, sku, stock, price, products!inner(id, title, price, status, product_images(url, position))")
      .in("id", ids),
    getSettings(),
  ]);
  if (error) throw new Error(error.message);

  const items = lines.map((l) => {
    const v = variants?.find((x) => x.id === l.variantId);
    if (!v || v.products.status !== "active") throw new Error("An item in your bag is no longer available. Please remove it.");
    const qty = Math.max(1, Math.floor(l.quantity));
    if (v.stock < qty) {
      throw new Error(v.stock === 0 ? `${v.products.title} (${v.title}) just sold out.` : `Only ${v.stock} left of ${v.products.title} (${v.title}).`);
    }
    const img = [...v.products.product_images].sort((a, b) => a.position - b.position)[0]?.url ?? null;
    return {
      product_id: v.products.id,
      variant_id: v.id,
      title: v.products.title,
      variant_title: v.title,
      sku: v.sku,
      image_url: img,
      price: Number(v.price ?? v.products.price),
      quantity: qty,
    };
  });
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  let discount = 0;
  let freeShipping = false;
  let discountCode: string | null = null;
  let discountError: string | null = null;
  if (opts.code?.trim()) {
    const code = opts.code.trim().toUpperCase();
    const { data: d } = await supabaseAdmin.from("discounts").select("*").eq("code", code).maybeSingle();
    const now = new Date();
    if (!d || !d.active) discountError = "That code isn't valid.";
    else if (d.starts_at && new Date(d.starts_at) > now) discountError = "That code isn't active yet.";
    else if (d.expires_at && new Date(d.expires_at) < now) discountError = "That code has expired.";
    else if (d.usage_limit != null && d.used_count >= d.usage_limit) discountError = "That code has been fully used.";
    else if (subtotal < Number(d.min_order)) discountError = `Add ₹${Math.ceil(Number(d.min_order) - subtotal)} more to use this code.`;
    else if ((d.first_order_only || d.once_per_customer) && !opts.userId) discountError = "Sign in to use this code.";
    else {
      if (opts.userId && (d.first_order_only || d.once_per_customer)) {
        const { data: past } = await supabaseAdmin
          .from("orders").select("discount_code").eq("user_id", opts.userId).in("status", COUNTED);
        if (d.first_order_only && (past?.length ?? 0) > 0) discountError = "This code is for your first order only.";
        else if (d.once_per_customer && past?.some((o) => o.discount_code === d.code)) discountError = "You've already used this code.";
      }
      if (!discountError) {
        if (d.kind === "free_shipping") freeShipping = true;
        else discount = d.kind === "percent" ? Math.round((subtotal * Number(d.value)) / 100) : Math.min(Number(d.value), subtotal);
        discountCode = d.code;
      }
    }
  }

  const afterDiscount = subtotal - discount;
  const method: ShippingMethod = opts.shipping === "express" && settings.express_enabled ? "express" : "standard";
  const freeOver = Number(settings.free_shipping_over);
  let shipping = method === "express" ? Number(settings.express_shipping_fee) : Number(settings.shipping_fee);
  if (freeShipping || (method === "standard" && freeOver > 0 && afterDiscount >= freeOver)) shipping = 0;

  if (opts.payment === "cod" && !settings.cod_enabled) throw new Error("Cash on delivery isn't available right now.");
  const codFee = opts.payment === "cod" ? Number(settings.cod_fee) : 0;
  const beforeGift = afterDiscount + shipping + codFee;

  let giftCardAmount = 0;
  let giftCardCode: string | null = null;
  let giftCardError: string | null = null;
  if (opts.giftCard?.trim()) {
    const code = opts.giftCard.trim().toUpperCase();
    const { data: g } = await supabaseAdmin.from("gift_cards").select("*").eq("code", code).maybeSingle();
    if (!g || !g.active) giftCardError = "That gift card isn't valid.";
    else if (g.expires_at && new Date(g.expires_at) < new Date()) giftCardError = "That gift card has expired.";
    else if (Number(g.balance) <= 0) giftCardError = "That gift card has no balance left.";
    else {
      giftCardAmount = Math.min(Number(g.balance), beforeGift);
      giftCardCode = g.code;
    }
  }

  return {
    items,
    subtotal,
    discount,
    discountCode,
    discountError,
    shippingMethod: method,
    shipping,
    codFee,
    giftCardAmount,
    giftCardCode,
    giftCardError,
    total: Math.max(beforeGift - giftCardAmount, 0),
  };
}

// ---------- Razorpay ----------
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
export function razorpayConfigured() { return !!process.env["RAZORPAY_KEY_ID"] && !!process.env["RAZORPAY_KEY_SECRET"]; }

function safeEqualHex(a: string, b: string) {
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
  if (!email || !password) throw new Error("Shiprocket isn't connected yet. Add the Shiprocket API login in Lovable secrets, or enter tracking by hand.");
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
    body: body ? JSON.stringify(body) : null,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message ?? `Shiprocket error ${res.status}`);
  return json;
}

// ---------- Uploads ----------
export const IMAGE_BUCKET = "product-images";
export const imageUrl = (path: string) => `/api/public/img/${path}`;

export async function uploadBase64(folder: string, file: { type: string; base64: string; name?: string | undefined }) {
  const bytes = Buffer.from(file.base64, "base64");
  if (bytes.length > 8 * 1024 * 1024) throw new Error("Files must be under 8MB");
  const ext = (file.name?.split(".").pop() ?? file.type.split("/")[1] ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const base = (file.name ?? "file").replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "file";
  const path = `${folder}/${Date.now().toString(36)}-${base}.${ext}`;
  const { error } = await supabaseAdmin.storage.from(IMAGE_BUCKET).upload(path, bytes, { contentType: file.type });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return { path, url: imageUrl(path) };
}
