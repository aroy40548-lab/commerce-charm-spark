import { COLLECTIONS_QUERY, PRODUCTS_QUERY, PRODUCT_BY_HANDLE_QUERY, storefrontApiRequest } from "@/lib/shopify";

export interface Money { amount: string; currencyCode: string }

export interface Variant {
  id: string;
  title: string;
  price: Money;
  compareAtPrice: Money | null;
  availableForSale: boolean;
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

export interface Category { id: string; name: string; image_url: string | null; position: number; productIds: string[] | null }

// Category order shown in the store; any new product type in Shopify is appended.
const CATEGORY_ORDER = [
  "Tees", "Baggy Jeans", "Hoodies", "Headwear", "Accessories", "Footwear",
  "Jorts", "Sweatpants Wide Leg", "Japanese Trousers", "Boxy Shirts",
];

export async function fetchProducts(first = 100): Promise<Product[]> {
  const data = await storefrontApiRequest(PRODUCTS_QUERY, { first });
  return (data?.data?.products?.edges ?? []) as Product[];
}

export async function fetchProductByHandle(handle: string): Promise<Product | null> {
  const data = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle });
  const node = data?.data?.product;
  return node ? ({ node } as Product) : null;
}

// Categories = Shopify collections (with their collection image) plus any product types
// not already covered by a collection. Everything is managed in Shopify admin.
export async function fetchCategories(): Promise<Category[]> {
  const [products, colData] = await Promise.all([fetchProducts(250), storefrontApiRequest(COLLECTIONS_QUERY)]);
  const out: Omit<Category, "position">[] = [];
  const seen = new Set<string>();
  type ColNode = { handle: string; title: string; image: { url: string } | null; products: { edges: Array<{ node: { id: string; images: { edges: Array<{ node: { url: string } }> } } }> } };
  for (const e of (colData?.data?.collections?.edges ?? []) as Array<{ node: ColNode }>) {
    const c = e.node;
    if (c.handle === "frontpage" || c.products.edges.length === 0) continue;
    const key = c.title.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: c.handle,
      name: c.title,
      image_url: c.image?.url ?? c.products.edges[0]?.node.images.edges[0]?.node.url ?? null,
      productIds: c.products.edges.map((p) => p.node.id),
    });
  }
  const types: Omit<Category, "position">[] = [];
  for (const p of products) {
    const t = p.node.productType;
    if (!t || seen.has(t.trim().toLowerCase())) continue;
    seen.add(t.trim().toLowerCase());
    types.push({ id: t, name: t, image_url: p.node.images.edges[0]?.node.url ?? null, productIds: null });
  }
  const rank = (n: string) => { const i = CATEGORY_ORDER.indexOf(n); return i === -1 ? 999 : i; };
  types.sort((a, b) => rank(a.name) - rank(b.name));
  return [...out, ...types].map((c, position) => ({ ...c, position }));
}

export function productInCategory(p: Product, category: Category | undefined, name: string) {
  if (category?.productIds) return category.productIds.includes(p.node.id);
  return p.node.productType === name;
}

export function formatMoney(amount: string | number, currencyCode = "INR") {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(0)}`;
  }
}
