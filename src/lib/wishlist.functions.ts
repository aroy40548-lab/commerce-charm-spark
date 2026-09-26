import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CUSTOMER_GRAPHQL_URL } from "@/lib/customerAccount";

// Verifies the Customer Account API access token with Shopify and returns the customer ID.
async function shopifyCustomerId(token: string) {
  const res = await fetch(CUSTOMER_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ query: "query { customer { id } }" }),
  });
  const json = res.ok ? await res.json() : null;
  const id = json?.data?.customer?.id as string | undefined;
  if (!id) throw new Error("Please sign in again");
  return id;
}

const tokenSchema = z.string().min(10).max(4000);

export const getMyWishlist = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const customerId = await shopifyCustomerId(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.from("shopify_wishlists").select("handle").eq("customer_id", customerId);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => r.handle);
  });

export const setMyWishlist = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ token: tokenSchema, handles: z.array(z.string().min(1).max(255)).max(200) }).parse(d),
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
