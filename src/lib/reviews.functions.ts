import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CUSTOMER_GRAPHQL_URL } from "@/lib/customerAccount";
import { storefrontApiRequest } from "@/lib/shopify";

const BUCKET = "review-photos";
const handleSchema = z.string().min(1).max(255).regex(/^[a-z0-9-]+$/);
const tokenSchema = z.string().min(10).max(4000);

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function productNumericId(handle: string) {
  const d = await storefrontApiRequest(`query($h: String!) { product(handle: $h) { id } }`, { h: handle });
  const gid = d?.data?.product?.id as string | undefined;
  return gid ? gid.split("/").pop()! : null;
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
  const first = (c.firstName as string | null) || email.split("@")[0] || "Customer";
  const name = c.lastName ? `${first} ${String(c.lastName).charAt(0)}.` : first;
  return { id: c.id as string, name, productIds };
}

async function signPhotos(paths: string[]) {
  if (!paths.length) return [];
  const sb = await admin();
  const { data } = await sb.storage.from(BUCKET).createSignedUrls(paths, 60 * 60 * 24);
  return (data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[];
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
}

export const getProductReviews = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ handle: handleSchema }).parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: rows, error } = await sb
      .from("product_reviews")
      .select("id, rating, title, body, customer_name, created_at, photo_paths")
      .eq("product_handle", data.handle)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error(error);
      return { average: 0, count: 0, reviews: [] as PublicReview[] };
    }
    const reviews: PublicReview[] = await Promise.all(
      (rows ?? []).map(async (r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        name: r.customer_name,
        verified: true,
        createdAt: r.created_at,
        pictures: await signPhotos(r.photo_paths ?? []),
      })),
    );
    const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    return { average, count: reviews.length, reviews };
  });

export const getReviewEligibility = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: tokenSchema, handle: handleSchema }).parse(d))
  .handler(async ({ data }) => {
    const [c, pid] = await Promise.all([customerWithOrders(data.token), productNumericId(data.handle)]);
    if (!pid) return { status: "unavailable" as const };
    if (!c.productIds.has(pid)) return { status: "not_purchased" as const };
    const sb = await admin();
    const { data: mine } = await sb
      .from("product_reviews")
      .select("rating, title, body")
      .eq("customer_id", c.id)
      .eq("product_handle", data.handle)
      .maybeSingle();
    return { status: "eligible" as const, name: c.name, existing: mine ?? null };
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
        handle: handleSchema,
        rating: z.number().int().min(1).max(5),
        title: z.string().trim().max(100).optional(),
        body: z.string().trim().min(3).max(2000),
        images: z.array(imageSchema).max(5),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const [c, pid] = await Promise.all([customerWithOrders(data.token), productNumericId(data.handle)]);
    if (!pid) throw new Error("This product can't be reviewed right now");
    if (!c.productIds.has(pid)) throw new Error("Only customers who bought this can review it");
    const sb = await admin();

    const { data: prev } = await sb
      .from("product_reviews")
      .select("photo_paths")
      .eq("customer_id", c.id)
      .eq("product_handle", data.handle)
      .maybeSingle();

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
        shopify_product_id: pid,
        customer_id: c.id,
        customer_name: c.name,
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
  .inputValidator((d) => z.object({ token: tokenSchema, handle: handleSchema }).parse(d))
  .handler(async ({ data }) => {
    const c = await customerWithOrders(data.token);
    const sb = await admin();
    const { data: row } = await sb
      .from("product_reviews")
      .delete()
      .eq("customer_id", c.id)
      .eq("product_handle", data.handle)
      .select("photo_paths")
      .maybeSingle();
    if (row?.photo_paths?.length) await sb.storage.from(BUCKET).remove(row.photo_paths);
    return { ok: true };
  });
