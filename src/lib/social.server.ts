import type { supabaseAdmin } from "@/integrations/supabase/client.server";
import { publicName } from "./reels";
import { avatarUrls } from "./profile.server";
type Db = typeof supabaseAdmin;

export type Person = { id: string; name: string; username: string | null; avatarUrl: string | null };

export async function people(sb: Db, ids: Array<string | null | undefined>) {
  const map = new Map<string, Person>();
  const uniq = [...new Set(ids.filter(Boolean) as string[])];
  if (!uniq.length) return map;
  const { data } = await sb.from("profiles").select("id, full_name, first_name, last_name, username, avatar_path").in("id", uniq);
  const urls = await avatarUrls(sb, (data ?? []).map((p) => p.avatar_path));
  data?.forEach((p) => map.set(p.id, {
    id: p.id,
    name: p.full_name?.trim() || publicName(p),
    username: p.username && !p.username.includes("@") ? p.username : null,
    avatarUrl: p.avatar_path ? urls.get(p.avatar_path) ?? null : null,
  }));
  return map;
}

export async function signed(sb: Db, bucket: "posts" | "reels", paths: string[]) {
  if (!paths.length) return new Map<string, string>();
  const { data } = await sb.storage.from(bucket).createSignedUrls([...new Set(paths)], 60 * 60 * 6);
  return new Map((data ?? []).map((s) => [s.path ?? "", s.signedUrl]));
}

export async function isBlockedEitherWay(sb: Db, a: string, b: string) {
  const { data } = await sb.from("blocks").select("blocker_id").or(`and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`).limit(1);
  return !!data?.length;
}
