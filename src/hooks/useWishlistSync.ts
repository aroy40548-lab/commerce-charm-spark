import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWishlistStore } from "@/stores/wishlistStore";
import { getMyWishlist, setMyWishlist } from "@/lib/wishlist.functions";

// Keeps the wishlist in the customer's account: on sign-in, browser-saved
// products merge with account-saved ones; later changes save to the account.
export function useWishlistSync() {
  const signedIn = useRef(false);

  useEffect(() => {
    const mergeFromAccount = async () => {
      try {
        const serverHandles = await getMyWishlist();
        const local = useWishlistStore.getState().items;
        const known = new Set(local.map((i) => i.handle));
        const missing = serverHandles.filter((h) => !known.has(h));

        let items = local;
        if (missing.length) {
          const { data } = await supabase
            .from("products")
            .select("handle, title, price, product_images(url, position)")
            .in("handle", missing);
          const fetched = (data ?? []).map((p) => ({
            handle: p.handle,
            title: p.title,
            image:
              [...(p.product_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null,
            price: String(p.price),
            currencyCode: "INR",
          }));
          items = [...local, ...fetched];
          useWishlistStore.setState({ items });
        }
        // Push the merged set so browser saves from before sign-in are kept.
        await setMyWishlist({ data: { handles: items.map((i) => i.handle) } });
      } catch {
        // Offline or transient failure — local wishlist still works.
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" && !signedIn.current) {
        signedIn.current = true;
        void mergeFromAccount();
      }
      if (event === "SIGNED_OUT") signedIn.current = false;
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !signedIn.current) {
        signedIn.current = true;
        void mergeFromAccount();
      }
    });

    // Save every later change to the account while signed in.
    const unsubStore = useWishlistStore.subscribe((state) => {
      if (!signedIn.current) return;
      void setMyWishlist({ data: { handles: state.items.map((i) => i.handle) } }).catch(() => {});
    });

    return () => {
      sub.subscription.unsubscribe();
      unsubStore();
    };
  }, []);
}
