import { useEffect, useRef } from "react";
import { useWishlistStore } from "@/stores/wishlistStore";
import { useAuth } from "@/hooks/useAuth";
import { getMyWishlist, setMyWishlist } from "@/lib/account.functions";
import { fetchProductByHandle } from "@/lib/catalog";

// Keeps saved products on the customer's account: on sign-in, browser saves
// merge with account saves; later changes save to the account.
export function useWishlistSync() {
  const userId = useAuth().user?.id;
  const ready = useRef(false);

  useEffect(() => {
    ready.current = false;
    if (!userId) return;
    let cancelled = false;

    (async () => {
      try {
        const serverHandles = await getMyWishlist();
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
        await setMyWishlist({ data: { handles: items.map((i) => i.handle) } });
        ready.current = true;
      } catch {
        // Offline or transient failure — local wishlist still works.
      }
    })();

    const unsub = useWishlistStore.subscribe((state) => {
      if (!ready.current) return;
      void setMyWishlist({ data: { handles: state.items.map((i) => i.handle) } }).catch(() => {});
    });
    return () => { cancelled = true; unsub(); };
  }, [userId]);
}
