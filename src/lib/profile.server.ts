import type { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getRequestHeader } from "@tanstack/react-start/server";
type Db = typeof supabaseAdmin;

/** Signed-in viewer for public functions (optional). */
export async function viewerId(sb: Db): Promise<string | null> {
  const h = getRequestHeader("authorization") ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token || token.startsWith("sb_")) return null;
  const { data } = await sb.auth.getUser(token);
  return data.user?.id ?? null;
}

export async function avatarUrls(sb: Db, paths: Array<string | null | undefined>) {
  const list = [...new Set(paths.filter((p): p is string => !!p))];
  const map = new Map<string, string>();
  if (!list.length) return map;
  const { data } = await sb.storage.from("reels").createSignedUrls(list, 60 * 60 * 6);
  data?.forEach((s) => s.path && s.signedUrl && map.set(s.path, s.signedUrl));
  return map;
}

