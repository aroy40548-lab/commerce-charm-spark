import { getProduct, listCategories, listProducts } from "@/lib/catalog.functions";

export interface Money { amount: string; currencyCode: string }

export interface Variant {
  id: string;
  title: string;
  price: Money;
  compareAtPrice: Money | null;
  availableForSale: boolean;
  quantityAvailable: number;
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

// Catalog lives in ZANKYO's own database and is managed from the admin panel.
export async function fetchProducts(): Promise<Product[]> {
  return listProducts();
}

export async function fetchProductByHandle(handle: string): Promise<Product | null> {
  return getProduct({ data: { handle } });
}

export async function fetchCategories(): Promise<Category[]> {
  return listCategories();
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
