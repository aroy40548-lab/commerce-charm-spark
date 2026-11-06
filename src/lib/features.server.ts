import { mergeFeatures, type FeatureKey, type Features } from "./features";

export async function loadFeatures(): Promise<Features> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("store_settings").select("features").eq("id", 1).maybeSingle();
  return mergeFeatures(data?.features);
}
export async function featureOn(key: FeatureKey) {
  return (await loadFeatures())[key];
}
/** Gemini key saved in admin wins; falls back to the project secret. */
export async function geminiKey(): Promise<string | undefined> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("app_secrets").select("gemini_api_key").eq("id", 1).maybeSingle();
  return data?.gemini_api_key?.trim() || process.env["GEMINI_API_KEY"] || undefined;
}
