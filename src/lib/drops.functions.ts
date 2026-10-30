import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;
const COLS = "id, title, description, image_url, product_handle, drop_at, whatsapp_url, active";

/** Public: active drops (upcoming + dropped in the last 14 days). */
export const listDrops = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const { data } = await sb.from("drops").select(COLS).eq("active", true).gte("drop_at", since).order("drop_at");
  return data ?? [];
});

export const adminListDrops = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireStaff } = await import("./admin/guard.server");
    await requireStaff(context as never);
    const sb = await admin();
    const { data } = await sb.from("drops").select(COLS).order("drop_at", { ascending: false }).limit(100);
    return data ?? [];
  });

const httpsOrNull = z.string().trim().max(500).refine((u) => u.startsWith("https://") || u.startsWith("/"), "Must be https").nullable();

export const adminSaveDrop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(600),
    image_url: httpsOrNull,
    product_handle: z.string().trim().regex(/^[a-z0-9-]+$/).max(120).nullable(),
    drop_at: z.string().datetime({ offset: true }),
    whatsapp_url: z.string().trim().max(300).refine((u) => u.startsWith("https://"), "Must be https").nullable(),
    active: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { requireStaff } = await import("./admin/guard.server");
    await requireStaff(context as never, "products");
    const sb = await admin();
    const { id, ...row } = data;
    const { error } = id ? await sb.from("drops").update(row).eq("id", id) : await sb.from("drops").insert(row);
    if (error) throw new Error("Couldn't save drop");
    return { ok: true };
  });

export const adminDeleteDrop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { requireStaff } = await import("./admin/guard.server");
    await requireStaff(context as never, "products");
    const sb = await admin();
    await sb.from("drops").delete().eq("id", data.id);
    return { ok: true };
  });
