import { useEffect, useRef } from "react";
import { useWishlistStore } from "@/stores/wishlistStore";
import { useCustomerToken } from "@/stores/customerStore";
import { getMyWishlist, setMyWishlist } from "@/lib/wishlist.functions";
import { fetchProductByHandle } from "@/lib/catalog";

// Keeps saved products on the Shopify customer's account: on sign-in, browser
// saves merge with account saves; later changes save to the account.
export function useWishlistSync() {
  const token = useCustomerToken();
  const ready = useRef(false);

  useEffect(() => {
    ready.current = false;
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        const serverHandles = await getMyWishlist({ data: { token } });
        const local = useWishlistStore.getState().items;
        const known = new Set(local.map((i) => i.handle));
        const missing = serverHandles.filter((h) => !known.has(h));
        const fetched = (await Promise.all(missing.map((h) => fetchProductByHandle(h).catch(() => null))))
          .filter((p): p is NonNullable<typeof p> => !!p)
          .map((p) => ({
            handle: p.node.handle,
            title: p.node.title,
            image: p.node.images.edges[0]?.node.url ?? null,
            price: p.node.priceRange.minVariantPrice.amount,
            currencyCode: p.node.priceRange.minVariantPrice.currencyCode,
          }));
        if (cancelled) return;
        const items = [...local, ...fetched];
        if (fetched.length) useWishlistStore.setState({ items });
        await setMyWishlist({ data: { token, handles: items.map((i) => i.handle) } });
        ready.current = true;
      } catch {
        // Offline or transient failure — local wishlist still works.
      }
    })();

    const unsub = useWishlistStore.subscribe((state) => {
      if (!ready.current) return;
      void setMyWishlist({ data: { token, handles: state.items.map((i) => i.handle) } }).catch(() => {});
    });
    return () => { cancelled = true; unsub(); };
  }, [token]);
}
