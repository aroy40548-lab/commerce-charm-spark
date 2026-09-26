import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CUSTOMER_ID_QUERY, storefrontApiRequest } from "@/lib/shopify";

// Verifies the Shopify customer access token and returns the customer's Shopify ID.
async function shopifyCustomerId(token: string) {
  const data = await storefrontApiRequest(CUSTOMER_ID_QUERY, { token });
  const id = data?.data?.customer?.id as string | undefined;
  if (!id) throw new Error("Please sign in again");
  return id;
}

export const getMyWishlist = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(10).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const customerId = await shopifyCustomerId(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.from("shopify_wishlists").select("handle").eq("customer_id", customerId);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => r.handle);
  });

export const setMyWishlist = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ token: z.string().min(10).max(200), handles: z.array(z.string().min(1).max(255)).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const customerId = await shopifyCustomerId(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const handles = [...new Set(data.handles)];
    const { error: dErr } = await supabaseAdmin.from("shopify_wishlists").delete().eq("customer_id", customerId);
    if (dErr) throw new Error(dErr.message);
    if (handles.length) {
      const { error } = await supabaseAdmin.from("shopify_wishlists").insert(handles.map((handle) => ({ customer_id: customerId, handle })));
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
