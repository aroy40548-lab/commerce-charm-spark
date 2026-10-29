import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Category, Product } from "@/lib/catalog";
import { parseSizeChart, type SizeChart } from "@/lib/sizeChart";

const PRODUCT_SELECT =
  "id, handle, title, description, price, compare_at_price, option_name, tags, product_type, created_at, " +
  "categories(name), product_images(url, alt, position), product_variants(id, title, stock, price, compare_at_price, position)";

type Row = {
  id: string; handle: string; title: string; description: string; price: number; compare_at_price: number | null;
  option_name: string; tags: string[]; product_type: string; categories: { name: string } | null;
  product_images: Array<{ url: string; alt: string | null; position: number }>;
  product_variants: Array<{ id: string; title: string; stock: number; price: number | null; compare_at_price: number | null; position: number }>;
};

// Same shape the storefront used with Shopify, so pages and cart need no rewrite.
function toProduct(r: Row): Product {
  const money = (n: number | null | undefined) => (n == null ? null : { amount: String(n), currencyCode: "INR" });
  const variants = [...r.product_variants].sort((a, b) => a.position - b.position).map((v) => ({
    id: v.id,
    title: v.title,
    price: money(v.price ?? r.price)!,
    compareAtPrice: money(v.compare_at_price ?? r.compare_at_price),
    availableForSale: v.stock > 0,
    quantityAvailable: v.stock,
    selectedOptions: [{ name: r.option_name || "Size", value: v.title }],
  }));
  const prices = variants.map((v) => Number(v.price.amount));
  return {
    node: {
      id: r.id,
      title: r.title,
      description: r.description,
      handle: r.handle,
      productType: r.categories?.name ?? r.product_type,
      tags: r.tags,
      priceRange: { minVariantPrice: money(prices.length ? Math.min(...prices) : r.price)! },
      images: { edges: [...r.product_images].sort((a, b) => a.position - b.position).map((i) => ({ node: { url: i.url, altText: i.alt } })) },
      variants: { edges: variants.map((node) => ({ node })) },
      options: [{ name: r.option_name || "Size", values: variants.map((v) => v.title) }],
    },
  };
}

async function db() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

export const listProducts = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await db();
  const { data, error } = await sb.from("products").select(PRODUCT_SELECT).eq("status", "active").order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  return (data as unknown as Row[]).map(toProduct);
});

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ handle: z.string().min(1).max(255) }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    const { data: row, error } = await sb.from("products").select(PRODUCT_SELECT).eq("handle", data.handle).eq("status", "active").maybeSingle();
    if (error) throw new Error(error.message);
    return row ? toProduct(row as unknown as Row) : null;
  });

export const listCategories = createServerFn({ method: "GET" }).handler(async (): Promise<Category[]> => {
  const sb = await db();
  const { data, error } = await sb
    .from("categories")
    .select("id, name, handle, image_url, position, products(id, status, product_images(url, position))")
    .order("position");
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((c) => {
      const live = c.products.filter((p) => p.status === "active");
      const fallback = live.flatMap((p) => [...p.product_images].sort((a, b) => a.position - b.position)).at(0)?.url ?? null;
      return { id: c.id, name: c.name, image_url: c.image_url ?? fallback, position: c.position, productIds: live.map((p) => p.id) };
    })
    .filter((c) => c.productIds.length > 0);
});

// Size chart + "Complete the Fit" picks for one product page.
export const getProductExtras = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ handle: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    const { data: p } = await sb.from("products").select("size_chart, paired_product_ids").eq("handle", data.handle).eq("status", "active").maybeSingle();
    if (!p) return { sizeChart: null as SizeChart | null, paired: [] as Product[] };
    const ids = (p.paired_product_ids ?? []).slice(0, 8);
    let paired: Product[] = [];
    if (ids.length) {
      const { data: rows } = await sb.from("products").select(PRODUCT_SELECT).in("id", ids).eq("status", "active");
      const list = ((rows ?? []) as unknown as Row[]).map(toProduct);
      paired = ids.map((id) => list.find((x) => x.node.id === id)).filter((x): x is Product => !!x);
    }
    return { sizeChart: parseSizeChart(p.size_chart), paired };
  });
