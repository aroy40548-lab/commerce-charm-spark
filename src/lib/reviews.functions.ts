import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "review-photos";
const handleSchema = z.string().min(1).max(255).regex(/^[a-z0-9-]+$/);
// Orders that went through; reviews unlock once the money/COD order is confirmed.
const BOUGHT = ["paid", "confirmed", "shipped", "delivered"];

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function signPhotos(paths: string[]) {
  if (!paths.length) return [];
  const sb = await admin();
  const { data } = await sb.storage.from(BUCKET).createSignedUrls(paths, 60 * 60 * 24);
  return (data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[];
}

/** Product the signed-in customer has a real order for, plus their display name. */
async function purchase(userId: string, email: string, handle: string) {
  const sb = await admin();
  const { data: product } = await sb.from("products").select("id").eq("handle", handle).maybeSingle();
  if (!product) return null;
  const { data: rows } = await sb
    .from("order_items")
    .select("orders!inner(user_id, status)")
    .eq("product_id", product.id)
    .eq("orders.user_id", userId)
    .in("orders.status", BOUGHT)
    .limit(1);
  const { data: p } = await sb.from("profiles").select("first_name, last_name").eq("id", userId).maybeSingle();
  const first = p?.first_name || email.split("@")[0] || "Customer";
  return { productId: product.id, bought: (rows?.length ?? 0) > 0, name: p?.last_name ? `${first} ${p.last_name.charAt(0)}.` : first };
}

export interface PublicReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  name: string;
  verified: boolean;
  createdAt: string;
  pictures: string[];
  reply: string | null;
}

export const getProductReviews = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ handle: handleSchema }).parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: rows, error } = await sb
      .from("product_reviews")
      .select("id, rating, title, body, customer_name, created_at, photo_paths, admin_reply")
      .eq("product_handle", data.handle)
      .eq("hidden", false)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error(error);
      return { average: 0, count: 0, reviews: [] as PublicReview[] };
    }
    const reviews: PublicReview[] = await Promise.all(
      (rows ?? []).map(async (r) => ({
        id: r.id, rating: r.rating, title: r.title, body: r.body, name: r.customer_name,
        verified: true, createdAt: r.created_at, pictures: await signPhotos(r.photo_paths ?? []), reply: r.admin_reply,
      })),
    );
    const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    return { average, count: reviews.length, reviews };
  });

export const getReviewEligibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ handle: handleSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const email = String((context.claims as { email?: string }).email ?? "");
    const p = await purchase(context.userId, email, data.handle);
    if (!p) return { status: "unavailable" as const };
    if (!p.bought) return { status: "not_purchased" as const };
    const sb = await admin();
    const { data: mine } = await sb.from("product_reviews").select("rating, title, body")
      .eq("customer_id", context.userId).eq("product_handle", data.handle).maybeSingle();
    return { status: "eligible" as const, name: p.name, existing: mine ?? null };
  });

const imageSchema = z.object({
  type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  base64: z.string().max(7_000_000),
});

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      handle: handleSchema,
      rating: z.number().int().min(1).max(5),
      title: z.string().trim().max(100).optional(),
      body: z.string().trim().min(3).max(2000),
      images: z.array(imageSchema).max(5),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const email = String((context.claims as { email?: string }).email ?? "");
    const p = await purchase(context.userId, email, data.handle);
    if (!p) throw new Error("This product can't be reviewed right now");
    if (!p.bought) throw new Error("Only customers who bought this can review it");
    const sb = await admin();

    const { data: prev } = await sb.from("product_reviews").select("photo_paths")
      .eq("customer_id", context.userId).eq("product_handle", data.handle).maybeSingle();

    let photoPaths = prev?.photo_paths ?? [];
    if (data.images.length) {
      const uploaded: string[] = [];
      for (const img of data.images) {
        const bytes = Buffer.from(img.base64, "base64");
        if (bytes.length > 5 * 1024 * 1024) throw new Error("Each photo must be under 5MB");
        const path = `${data.handle}/${crypto.randomUUID()}.${img.type.split("/")[1]}`;
        const up = await sb.storage.from(BUCKET).upload(path, bytes, { contentType: img.type });
        if (up.error) throw new Error("Photo upload failed");
        uploaded.push(path);
      }
      if (photoPaths.length) await sb.storage.from(BUCKET).remove(photoPaths);
      photoPaths = uploaded;
    }

    const { error } = await sb.from("product_reviews").upsert(
      {
        product_handle: data.handle,
        shopify_product_id: p.productId,
        customer_id: context.userId,
        user_id: context.userId,
        customer_name: p.name,
        rating: data.rating,
        title: data.title || null,
        body: data.body,
        photo_paths: photoPaths,
      },
      { onConflict: "customer_id,product_handle" },
    );
    if (error) {
      console.error(error);
      throw new Error("Couldn't save your review, please try again");
    }
    return { ok: true };
  });

export const deleteMyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ handle: handleSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await admin();
    const { data: row } = await sb.from("product_reviews").delete()
      .eq("customer_id", context.userId).eq("product_handle", data.handle)
      .select("photo_paths").maybeSingle();
    if (row?.photo_paths?.length) await sb.storage.from(BUCKET).remove(row.photo_paths);
    return { ok: true };
  });
