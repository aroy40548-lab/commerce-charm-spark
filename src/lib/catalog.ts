import { PRODUCTS_QUERY, PRODUCT_BY_HANDLE_QUERY, storefrontApiRequest } from "@/lib/shopify";

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

export interface Category { id: string; name: string; image_url: string | null; position: number }

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

// Categories = Shopify product types.
export async function fetchCategories(): Promise<Category[]> {
  const products = await fetchProducts(250);
  const map = new Map<string, string | null>();
  for (const p of products) {
    const t = p.node.productType;
    if (t && !map.has(t)) map.set(t, p.node.images.edges[0]?.node.url ?? null);
  }
  const rank = (n: string) => { const i = CATEGORY_ORDER.indexOf(n); return i === -1 ? 999 : i; };
  return [...map.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([name, image_url], position) => ({ id: name, name, image_url, position }));
}

export function formatMoney(amount: string | number, currencyCode = "INR") {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(0)}`;
  }
}
