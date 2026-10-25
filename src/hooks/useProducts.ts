import { useQuery } from "@tanstack/react-query";
import { fetchCategories, fetchProductByHandle, fetchProducts } from "@/lib/catalog";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

// Live stock: refetch every 30s and when the tab regains focus.
export function useProduct(handle: string) {
  return useQuery({
    queryKey: ["product", handle],
    queryFn: () => fetchProductByHandle(handle),
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: fetchCategories, staleTime: 60_000 });
}
