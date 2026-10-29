import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

/** Public: Android app download info for the footer. */
export const getAndroidApp = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const { data } = await sb.from("store_settings").select("android_apk_path, android_apk_url, android_version, android_notes").eq("id", 1).single();
  const url = data?.android_apk_path ? `/api/public/img/${data.android_apk_path}` : data?.android_apk_url || null;
  return { url, version: data?.android_version ?? null, notes: data?.android_notes ?? null, uploaded: !!data?.android_apk_path };
});

/** Staff (settings): signed upload slot for a new APK. */
export const adminAppUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireStaff } = await import("./admin/guard.server");
    await requireStaff(context as never, "settings");
    const sb = await admin();
    const path = `app/zankyo-${Date.now()}.apk`;
    const { data, error } = await sb.storage.from("product-images").createSignedUploadUrl(path);
    if (error || !data) throw new Error("Couldn't start upload");
    return { path, token: data.token };
  });

export const adminSaveAndroidApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    path: z.string().regex(/^app\/zankyo-\d+\.apk$/).nullable(),
    url: z.string().trim().url().max(500).refine((u) => u.startsWith("https://"), "Must be https").nullable(),
    version: z.string().trim().max(30).nullable(),
    notes: z.string().trim().max(500).nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { requireStaff } = await import("./admin/guard.server");
    await requireStaff(context as never, "settings");
    const sb = await admin();
    const { error } = await sb.from("store_settings").update({
      android_apk_path: data.path, android_apk_url: data.url, android_version: data.version, android_notes: data.notes,
    }).eq("id", 1);
    if (error) throw new Error("Couldn't save");
    return { ok: true };
  });
