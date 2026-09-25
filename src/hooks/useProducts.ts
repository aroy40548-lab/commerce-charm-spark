import { useQuery } from "@tanstack/react-query";
import { fetchProductByHandle, fetchProducts } from "@/lib/shopify";

export function useProducts() {
  return useQuery({
    queryKey: ["shopify-products"],
    queryFn: () => fetchProducts(50),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

// Live stock: refetch every 30s and when the tab regains focus.
export function useProduct(handle: string) {
  return useQuery({
    queryKey: ["shopify-product", handle],
    queryFn: () => fetchProductByHandle(handle),
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}
