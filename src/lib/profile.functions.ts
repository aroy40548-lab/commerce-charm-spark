import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeUsername, profileComplete, usernameOk } from "@/lib/reels";

async function db() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}
type Db = Awaited<ReturnType<typeof db>>;

/** Signed-in viewer for public functions (optional). */
export async function viewerId(sb: Db): Promise<string | null> {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
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

export const getMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await db();
    const { data: p } = await sb.from("profiles").select("full_name, first_name, last_name, username, bio, avatar_path").eq("id", context.userId).maybeSingle();
    const urls = await avatarUrls(sb, [p?.avatar_path]);
    const suggested = p?.full_name || [p?.first_name, p?.last_name].filter(Boolean).join(" ");
    return {
      fullName: suggested ?? "",
      username: p?.username && usernameOk(p.username) ? p.username : "",
      bio: p?.bio ?? "",
      avatarUrl: p?.avatar_path ? urls.get(p.avatar_path) ?? null : null,
      complete: profileComplete(p),
    };
  });

export const checkUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ username: z.string().max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    const u = normalizeUsername(data.username);
    if (!usernameOk(u)) return { ok: false, reason: "invalid" as const };
    const sb = await db();
    const { data: row } = await sb.from("profiles").select("id").ilike("username", u).maybeSingle();
    return row && row.id !== context.userId ? { ok: false, reason: "taken" as const } : { ok: true, reason: null };
  });

export const saveMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      fullName: z.string().trim().min(2).max(50),
      username: z.string().max(40),
      bio: z.string().trim().max(150).default(""),
      avatarPath: z.string().max(200).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const u = normalizeUsername(data.username);
    if (!usernameOk(u)) throw new Error("Username: 3–20 lowercase letters, numbers, . or _");
    if (data.fullName.includes("@")) throw new Error("Please enter your name, not an email");
    const sb = await db();
    const { data: taken } = await sb.from("profiles").select("id").ilike("username", u).neq("id", context.userId).maybeSingle();
    if (taken) throw new Error("That username is taken");
    const patch: Record<string, unknown> = { full_name: data.fullName, username: u, bio: data.bio };
    if (data.avatarPath !== undefined) {
      if (data.avatarPath && !data.avatarPath.startsWith(`avatars/${context.userId}/`)) throw new Error("Bad photo");
      patch["avatar_path"] = data.avatarPath;
    }
    const { error } = await sb.from("profiles").update(patch).eq("id", context.userId);
    if (error) throw new Error(error.message.includes("username") ? "That username is taken" : "Couldn't save your profile");
    return { username: u };
  });

export const createAvatarUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ type: z.enum(["image/jpeg", "image/png", "image/webp"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    const ext = data.type === "image/png" ? "png" : data.type === "image/webp" ? "webp" : "jpg";
    const path = `avatars/${context.userId}/${crypto.randomUUID()}.${ext}`;
    const { data: up, error } = await sb.storage.from("reels").createSignedUploadUrl(path);
    if (error || !up) throw new Error("Couldn't start the upload");
    return { path, token: up.token };
  });

export const getPublicProfile = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ username: z.string().max(40) }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    const u = normalizeUsername(data.username);
    const { data: p } = await sb.from("profiles").select("id, full_name, username, bio, avatar_path").ilike("username", u).maybeSingle();
    if (!p || !p.username) return null;
    const me = await viewerId(sb);
    const [followers, following, isFollowing, reels] = await Promise.all([
      sb.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", p.id),
      sb.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", p.id),
      me ? sb.from("follows").select("follower_id").eq("follower_id", me).eq("following_id", p.id).maybeSingle() : Promise.resolve({ data: null }),
      sb.from("reels").select("id, video_path, views").eq("user_id", p.id).eq("status", "live").order("created_at", { ascending: false }).limit(60),
    ]);
    const urls = await avatarUrls(sb, [p.avatar_path]);
    const vids = (reels.data ?? []).length
      ? (await sb.storage.from("reels").createSignedUrls((reels.data ?? []).map((r) => r.video_path), 60 * 60 * 6)).data ?? []
      : [];
    const vmap = new Map(vids.map((v) => [v.path, v.signedUrl]));
    return {
      id: p.id,
      name: p.full_name ?? p.username,
      username: p.username,
      bio: p.bio,
      avatarUrl: p.avatar_path ? urls.get(p.avatar_path) ?? null : null,
      followers: followers.count ?? 0,
      following: following.count ?? 0,
      isFollowing: !!isFollowing.data,
      isMe: me === p.id,
      reels: (reels.data ?? []).map((r) => ({ id: r.id, views: r.views, videoUrl: vmap.get(r.video_path) ?? "" })),
    };
  });

export const setFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), follow: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("You can't follow yourself");
    const sb = await db();
    if (data.follow) await sb.from("follows").upsert({ follower_id: context.userId, following_id: data.userId }, { onConflict: "follower_id,following_id" });
    else await sb.from("follows").delete().eq("follower_id", context.userId).eq("following_id", data.userId);
    return { ok: true };
  });
