import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CUSTOMER_GRAPHQL_URL } from "@/lib/customerAccount";
import { SHOPIFY_STORE_PERMANENT_DOMAIN } from "@/lib/shopify";

const JM = "https://judge.me/api/v1";

function jmToken() {
  const t = process.env["JUDGEME_API_TOKEN"];
  if (!t) throw new Error("Reviews are not configured yet");
  return t;
}

async function jmProduct(handle: string) {
  const u = new URL(`${JM}/products/-1`);
  u.search = new URLSearchParams({ api_token: jmToken(), shop_domain: SHOPIFY_STORE_PERMANENT_DOMAIN, handle }).toString();
  const res = await fetch(u);
  if (!res.ok) return null;
  const j = await res.json();
  return j?.product ? { id: j.product.id as number, externalId: String(j.product.external_id) } : null;
}

async function jmReviews(productId: number) {
  const u = new URL(`${JM}/reviews`);
  u.search = new URLSearchParams({
    api_token: jmToken(),
    shop_domain: SHOPIFY_STORE_PERMANENT_DOMAIN,
    product_id: String(productId),
    per_page: "100",
  }).toString();
  const res = await fetch(u);
  if (!res.ok) return [];
  const j = await res.json();
  return (j?.reviews ?? []) as any[];
}

async function customerWithOrders(token: string) {
  const res = await fetch(CUSTOMER_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({
      query: `query { customer { id firstName lastName emailAddress { emailAddress }
        orders(first: 100) { nodes { lineItems(first: 50) { nodes { productId } } } } } }`,
    }),
  });
  const json = res.ok ? await res.json() : null;
  const c = json?.data?.customer;
  if (!c?.id) throw new Error("Please sign in again");
  const productIds = new Set<string>();
  for (const o of c.orders?.nodes ?? [])
    for (const li of o.lineItems?.nodes ?? []) if (li.productId) productIds.add(String(li.productId).split("/").pop()!);
  const email = (c.emailAddress?.emailAddress as string | undefined) ?? "";
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || email.split("@")[0] || "Customer";
  return { email, name, productIds };
}

export interface PublicReview {
  id: number;
  rating: number;
  title: string | null;
  body: string | null;
  name: string;
  verified: boolean;
  createdAt: string;
  pictures: string[];
}

export const getProductReviews = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ handle: z.string().min(1).max(255) }).parse(d))
  .handler(async ({ data }) => {
    const p = await jmProduct(data.handle);
    if (!p) return { average: 0, count: 0, reviews: [] as PublicReview[] };
    const raw = (await jmReviews(p.id)).filter((r) => !r.hidden && r.published !== false);
    const reviews: PublicReview[] = raw.map((r) => ({
      id: r.id,
      rating: Number(r.rating) || 0,
      title: r.title ?? null,
      body: r.body ?? null,
      name: r.reviewer?.name ?? "Customer",
      verified: r.verified === "buyer" || r.verified === "verified-purchase" || !!r.verified_buyer,
      createdAt: r.created_at,
      pictures: (r.pictures ?? []).filter((x: any) => !x.hidden).map((x: any) => x.urls?.compact ?? x.urls?.original).filter(Boolean),
    }));
    const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    return { average, count: reviews.length, reviews };
  });

const tokenSchema = z.string().min(10).max(4000);

export const getReviewEligibility = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: tokenSchema, handle: z.string().min(1).max(255) }).parse(d))
  .handler(async ({ data }) => {
    const [c, p] = await Promise.all([customerWithOrders(data.token), jmProduct(data.handle)]);
    if (!p) return { status: "unavailable" as const };
    if (!c.productIds.has(p.externalId)) return { status: "not_purchased" as const };
    const existing = await jmReviews(p.id);
    const email = c.email.toLowerCase();
    if (email && existing.some((r) => r.reviewer?.email?.toLowerCase() === email)) return { status: "already_reviewed" as const };
    return { status: "eligible" as const, name: c.name };
  });

const imageSchema = z.object({
  type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  base64: z.string().max(7_000_000),
});

export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        token: tokenSchema,
        handle: z.string().min(1).max(255),
        rating: z.number().int().min(1).max(5),
        title: z.string().trim().max(100).optional(),
        body: z.string().trim().min(3).max(2000),
        images: z.array(imageSchema).max(5),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const [c, p] = await Promise.all([customerWithOrders(data.token), jmProduct(data.handle)]);
    if (!p) throw new Error("This product can't be reviewed right now");
    if (!c.productIds.has(p.externalId)) throw new Error("Only customers who bought this can review it");
    if (!c.email) throw new Error("Your account has no email address");
    const existing = await jmReviews(p.id);
    if (existing.some((r) => r.reviewer?.email?.toLowerCase() === c.email.toLowerCase()))
      throw new Error("You've already reviewed this product");

    const pictureUrls: string[] = [];
    if (data.images.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      for (const img of data.images) {
        const bytes = Buffer.from(img.base64, "base64");
        if (bytes.length > 5 * 1024 * 1024) throw new Error("Each photo must be under 5MB");
        const ext = img.type.split("/")[1];
        const path = `${p.externalId}/${crypto.randomUUID()}.${ext}`;
        const up = await supabaseAdmin.storage.from("review-photos").upload(path, bytes, { contentType: img.type });
        if (up.error) throw new Error("Photo upload failed");
        const signed = await supabaseAdmin.storage.from("review-photos").createSignedUrl(path, 60 * 60 * 24 * 30);
        if (signed.data?.signedUrl) pictureUrls.push(signed.data.signedUrl);
      }
    }

    const res = await fetch(`${JM}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_token: jmToken(),
        shop_domain: SHOPIFY_STORE_PERMANENT_DOMAIN,
        platform: "shopify",
        id: Number(p.externalId),
        email: c.email,
        name: c.name,
        rating: data.rating,
        title: data.title || undefined,
        body: data.body,
        picture_urls: pictureUrls,
      }),
    });
    if (!res.ok) {
      console.error("Judge.me review create failed", res.status, await res.text());
      throw new Error("Couldn't post your review, please try again");
    }
    return { ok: true };
  });
