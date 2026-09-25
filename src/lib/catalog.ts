import { supabase } from "@/integrations/supabase/client";

export interface Money { amount: string; currencyCode: string }

export interface Variant {
  id: string;
  title: string;
  price: Money;
  compareAtPrice: Money | null;
  availableForSale: boolean;
  stock: number;
  selectedOptions: Array<{ name: string; value: string }>;
}

export interface Product {
  node: {
    id: string;
    title: string;
    description: string;
    handle: string;
    productType: string;
    tags: string[];
    priceRange: { minVariantPrice: Money };
    images: { edges: Array<{ node: { url: string; altText: string | null } }> };
    variants: { edges: Array<{ node: Variant }> };
    options: Array<{ name: string; values: string[] }>;
  };
}

export interface Category { id: string; name: string; image_url: string | null; position: number }

const SELECT = `id, handle, title, description, price, compare_at_price, option_name, tags, created_at,
  categories(name), product_images(url, alt, position), product_variants(id, title, stock, price, position)`;

type Row = {
  id: string; handle: string; title: string; description: string; price: number; compare_at_price: number | null;
  option_name: string; tags: string[]; categories: { name: string } | null;
  product_images: Array<{ url: string; alt: string | null; position: number }>;
  product_variants: Array<{ id: string; title: string; stock: number; price: number | null; position: number }>;
};

const m = (n: number | string): Money => ({ amount: String(n), currencyCode: "INR" });

export function imageUrl(url: string) {
  if (url.startsWith("storage:")) return `/api/public/img/${url.slice(8)}`;
  return url;
}

function toProduct(r: Row): Product {
  const variants = [...r.product_variants].sort((a, b) => a.position - b.position);
  const compare = r.compare_at_price && Number(r.compare_at_price) > 0 ? m(r.compare_at_price) : null;
  return {
    node: {
      id: r.id,
      title: r.title,
      description: r.description,
      handle: r.handle,
      productType: r.categories?.name ?? "",
      tags: r.tags,
      priceRange: { minVariantPrice: m(r.price) },
      images: {
        edges: [...r.product_images].sort((a, b) => a.position - b.position)
          .map((i) => ({ node: { url: imageUrl(i.url), altText: i.alt } })),
      },
      variants: {
        edges: variants.map((v) => ({
          node: {
            id: v.id,
            title: v.title,
            price: m(v.price ?? r.price),
            compareAtPrice: compare,
            availableForSale: v.stock > 0,
            stock: v.stock,
            selectedOptions: [{ name: r.option_name, value: v.title }],
          },
        })),
      },
      options: [{ name: r.option_name, values: variants.map((v) => v.title) }],
    },
  };
}

export async function fetchProducts(first = 50): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select(SELECT).eq("active", true)
    .order("created_at", { ascending: true }).limit(first);
  if (error) throw error;
  return (data as unknown as Row[]).map(toProduct);
}

export async function fetchProductByHandle(handle: string): Promise<Product | null> {
  const { data, error } = await supabase.from("products").select(SELECT).eq("handle", handle).eq("active", true).maybeSingle();
  if (error) throw error;
  return data ? toProduct(data as unknown as Row) : null;
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("id, name, image_url, position").order("position");
  if (error) throw error;
  return (data ?? []).map((c) => ({ ...c, image_url: c.image_url ? imageUrl(c.image_url) : null }));
}

export function formatMoney(amount: string | number, currencyCode = "INR") {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(0)}`;
  }
}
