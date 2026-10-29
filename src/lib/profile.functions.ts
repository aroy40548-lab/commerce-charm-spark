import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeUsername, profileComplete, usernameOk } from "@/lib/reels";

async function db() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}
type Db = Awaited<ReturnType<typeof db>>;

async function helpers() {
  return import("./profile.server");
}

export const getMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await db();
    const { data: p } = await sb.from("profiles").select("full_name, first_name, last_name, username, bio, avatar_path, account_status, status_reason").eq("id", context.userId).maybeSingle();
    const urls = await (await helpers()).avatarUrls(sb, [p?.avatar_path]);
    const suggested = p?.full_name || [p?.first_name, p?.last_name].filter(Boolean).join(" ");
    return {
      fullName: suggested ?? "",
      username: p?.username && usernameOk(p.username) ? p.username : "",
      bio: p?.bio ?? "",
      avatarUrl: p?.avatar_path ? urls.get(p.avatar_path) ?? null : null,
      complete: profileComplete(p),
      status: p?.account_status ?? "active",
      statusReason: p?.status_reason ?? null,
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
    const patch: { full_name: string; username: string; bio: string; avatar_path?: string | null } = { full_name: data.fullName, username: u, bio: data.bio };
    if (data.avatarPath !== undefined) {
      if (data.avatarPath && !new RegExp(`^avatars/${context.userId}/[A-Za-z0-9._-]+$`).test(data.avatarPath)) throw new Error("Bad photo");
      patch.avatar_path = data.avatarPath ?? null;
    }
    const email = String((context.claims as { email?: string }).email ?? "") || null;
    const { error } = await sb.from("profiles").upsert({ id: context.userId, email, ...patch }, { onConflict: "id" });
    if (error) throw new Error(error.message.includes("username") ? "That username is taken" : "Couldn't save your profile");
    return { username: u, fullName: data.fullName, bio: data.bio };
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
    const { data: p } = await sb.from("profiles").select("id, full_name, username, bio, avatar_path, account_status, verified").ilike("username", u).maybeSingle();
    if (!p || !p.username) return null;
    const me = await (await helpers()).viewerId(sb);
    if (p.account_status !== "active" && me !== p.id) return null;
    const [followers, following, isFollowing, reels] = await Promise.all([
      sb.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", p.id),
      sb.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", p.id),
      me ? sb.from("follows").select("follower_id").eq("follower_id", me).eq("following_id", p.id).maybeSingle() : Promise.resolve({ data: null }),
      sb.from("reels").select("id, video_path, views").eq("user_id", p.id).eq("status", "live").order("created_at", { ascending: false }).limit(60),
    ]);
    const urls = await (await helpers()).avatarUrls(sb, [p.avatar_path]);
    const vids = (reels.data ?? []).length
      ? (await sb.storage.from("reels").createSignedUrls((reels.data ?? []).map((r) => r.video_path), 60 * 60 * 6)).data ?? []
      : [];
    const vmap = new Map(vids.map((v) => [v.path, v.signedUrl]));
    return {
      id: p.id,
      name: p.full_name ?? p.username,
      username: p.username,
      bio: p.bio,
      verified: !!p.verified,
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
    await (await import("./account.server")).assertCanUseReels(sb, context.userId);
    if (data.follow) await sb.from("follows").upsert({ follower_id: context.userId, following_id: data.userId }, { onConflict: "follower_id,following_id" });
    else await sb.from("follows").delete().eq("follower_id", context.userId).eq("following_id", data.userId);
    return { ok: true };
  });

type PublicPerson = { id: string; name: string; username: string; avatarUrl: string | null; following: boolean };

async function people(sb: Db, ids: string[], limit = 100): Promise<PublicPerson[]> {
  if (!ids.length) return [];
  const { data: rows } = await sb.from("profiles").select("id, full_name, username, avatar_path").in("id", ids.slice(0, limit)).eq("account_status", "active").not("username", "is", null);
  const h = await helpers();
  const me = await h.viewerId(sb);
  const urls = await h.avatarUrls(sb, (rows ?? []).map((r) => r.avatar_path));
  const { data: mine } = me ? await sb.from("follows").select("following_id").eq("follower_id", me).in("following_id", ids.slice(0, limit)) : { data: [] as Array<{ following_id: string }> };
  const f = new Set((mine ?? []).map((m) => m.following_id));
  const byId = new Map((rows ?? []).map((r) => [r.id, r]));
  return ids.flatMap((id) => {
    const r = byId.get(id);
    return r ? [{ id: r.id, name: r.full_name ?? r.username!, username: r.username!, avatarUrl: r.avatar_path ? urls.get(r.avatar_path) ?? null : null, following: f.has(r.id) }] : [];
  });
}

export const searchProfiles = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ q: z.string().trim().max(40) }).parse(d))
  .handler(async ({ data }) => {
    const q = data.q.replace(/^@/, "").replace(/[%_,()]/g, "");
    if (q.length < 1) return [] as PublicPerson[];
    const sb = await db();
    const { data: rows } = await sb.from("profiles").select("id").eq("account_status", "active").not("username", "is", null)
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`).limit(20);
    return people(sb, (rows ?? []).map((r) => r.id));
  });

export const listFollows = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ username: z.string().max(40), kind: z.enum(["followers", "following"]) }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    const { data: p } = await sb.from("profiles").select("id").ilike("username", normalizeUsername(data.username)).eq("account_status", "active").maybeSingle();
    if (!p) return [] as PublicPerson[];
    const { data: rows } = data.kind === "followers"
      ? await sb.from("follows").select("other:follower_id").eq("following_id", p.id).order("created_at", { ascending: false }).limit(200)
      : await sb.from("follows").select("other:following_id").eq("follower_id", p.id).order("created_at", { ascending: false }).limit(200);
    return people(sb, ((rows ?? []) as Array<{ other: string }>).map((r) => r.other), 200);
  });
