import { useQuery } from "@tanstack/react-query";
import { fetchProductByHandle, fetchProducts } from "@/lib/shopify";

export function useProducts() {
  return useQuery({
    queryKey: ["shopify-products"],
    queryFn: () => fetchProducts(50),
    staleTime: 60_000,
  });
}

export function useProduct(handle: string) {
  return useQuery({
    queryKey: ["shopify-product", handle],
    queryFn: () => fetchProductByHandle(handle),
    staleTime: 60_000,
  });
}
