import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FEATURES } from "./features";

export const getFeatures = createServerFn({ method: "GET" }).handler(async () => {
  const { loadFeatures } = await import("./features.server");
  return loadFeatures();
});

const keys = FEATURES.map((f) => f.key) as [string, ...string[]];

export const adminSaveFeatures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.record(z.enum(keys), z.boolean()).parse(d))
  .handler(async ({ data, context }) => {
    const g = await import("./admin/guard.server");
    await g.requireStaff(context as never, "settings");
    const { error } = await g.db.from("store_settings").update({ features: data, affiliates_enabled: data["affiliates"] !== false, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminAiKeyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const g = await import("./admin/guard.server");
    await g.requireStaff(context as never);
    const { data } = await g.db.from("app_secrets").select("gemini_api_key, updated_at").eq("id", 1).maybeSingle();
    const k = data?.gemini_api_key?.trim();
    return { saved: !!k, fromSecret: !k && !!process.env["GEMINI_API_KEY"], updatedAt: k ? data?.updated_at ?? null : null };
  });

export const adminSaveAiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ key: z.string().trim().max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const g = await import("./admin/guard.server");
    await g.requireStaff(context as never, "settings");
    const { error } = await g.db.from("app_secrets").upsert({ id: 1, gemini_api_key: data.key || null, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminTestAiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const g = await import("./admin/guard.server");
    await g.requireStaff(context as never);
    const { geminiKey } = await import("./features.server");
    const k = await geminiKey();
    if (!k) return { ok: false, message: "No key saved." };
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview", { headers: { "x-goog-api-key": k } });
    if (r.ok) return { ok: true, message: "Key works. If fits still fail, turn on billing in Google AI Studio." };
    return { ok: false, message: r.status === 400 || r.status === 401 || r.status === 403 ? "Google rejected this key." : `Google replied ${r.status}.` };
  });
