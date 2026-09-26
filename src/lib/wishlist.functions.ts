import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Returns the handles of all products the signed-in customer has saved.
export const getMyWishlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("wishlists")
      .select("products(handle)")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? [])
      .map((row) => (row.products as { handle: string } | null)?.handle)
      .filter((h): h is string => !!h);
  });

// Replaces the customer's saved products with the given set of handles.
export const setMyWishlist = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ handles: z.array(z.string()).max(200) }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const handles = [...new Set(data.handles)];
    const { data: products, error: pErr } = await context.supabase
      .from("products")
      .select("id, handle")
      .in("handle", handles.length ? handles : ["__none__"]);
    if (pErr) throw new Error(pErr.message);

    const { error: dErr } = await context.supabase
      .from("wishlists")
      .delete()
      .eq("user_id", context.userId);
    if (dErr) throw new Error(dErr.message);

    if (products && products.length) {
      const { error: iErr } = await context.supabase
        .from("wishlists")
        .insert(products.map((p) => ({ user_id: context.userId, product_id: p.id })));
      if (iErr) throw new Error(iErr.message);
    }
    return { ok: true };
  });
