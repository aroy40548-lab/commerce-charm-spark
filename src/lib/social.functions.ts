import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { feedWeight } from "@/lib/reels";
import { MAX_POST_PHOTOS, MAX_POST_PRODUCTS, MAX_PHOTO_BYTES, PAGE_SIZE, canMessage, pairOf } from "@/lib/social";

async function db() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}
type Db = Awaited<ReturnType<typeof db>>;
const helpers = () => import("./social.server");
const viewer = async (sb: Db) => (await import("./profile.server")).viewerId(sb);
const assertActive = async (sb: Db, id: string) => (await import("./account.server")).assertCanUseReels(sb, id);

export interface ProductChip { id: string; handle: string; title: string; price: number; image: string | null }
export interface PostCard {
  id: string; creatorId: string; username: string | null; name: string; avatarUrl: string | null; creatorCode: string | null;
  following: boolean; caption: string; createdAt: string;
  media: Array<{ url: string; thumb: string; w: number; h: number }>;
  likes: number; liked: boolean; saved: boolean; comments: number; products: ProductChip[];
}
export interface ReelTile {
  id: string; videoUrl: string; caption: string; creatorId: string; username: string | null; name: string; avatarUrl: string | null;
  likes: number; comments: number; views: number; createdAt: string; products: ProductChip[];
}
export type FeedItem = { type: "post"; post: PostCard } | { type: "reel"; reel: ReelTile };

type ProdRow = { position: number; products: { id: string; handle: string; title: string; price: number; status: string; product_images: Array<{ url: string; position: number }> } | null };
const PROD = "position, products(id, handle, title, price, status, product_images(url, position))";
function chips(rows: ProdRow[]): ProductChip[] {
  return [...rows].sort((a, b) => a.position - b.position)
    .flatMap((r) => (r.products && r.products.status === "active" ? [r.products] : []))
    .map((p) => ({ id: p.id, handle: p.handle, title: p.title, price: Number(p.price), image: [...p.product_images].sort((a, b) => a.position - b.position)[0]?.url ?? null }));
}

type PostRow = { id: string; user_id: string; caption: string; created_at: string; post_media: Array<{ path: string; thumb_path: string; width: number; height: number; position: number }>; post_products: ProdRow[] };
const POST_SELECT = `id, user_id, caption, created_at, post_media(path, thumb_path, width, height, position), post_products(${PROD})`;

async function toPosts(sb: Db, rows: PostRow[], me: string | null): Promise<PostCard[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const users = rows.map((r) => r.user_id);
  const h = await helpers();
  const paths = rows.flatMap((r) => r.post_media.flatMap((m) => [m.path, m.thumb_path]));
  const [ppl, urls, likes, mine, comments, saves, follows, affs] = await Promise.all([
    h.people(sb, users),
    h.signed(sb, "posts", paths),
    sb.from("post_likes").select("post_id").in("post_id", ids),
    me ? sb.from("post_likes").select("post_id").in("post_id", ids).eq("user_id", me) : Promise.resolve({ data: [] as Array<{ post_id: string }> }),
    sb.from("post_comments").select("post_id").in("post_id", ids).eq("hidden", false),
    me ? sb.from("saves").select("item_id").eq("user_id", me).eq("kind", "post").in("item_id", ids) : Promise.resolve({ data: [] as Array<{ item_id: string }> }),
    me ? sb.from("follows").select("following_id").eq("follower_id", me).in("following_id", users) : Promise.resolve({ data: [] as Array<{ following_id: string }> }),
    sb.from("affiliates").select("user_id, code").in("user_id", users).eq("status", "active"),
  ]);
  const count = (list: Array<{ post_id: string }> | null, id: string) => (list ?? []).filter((x) => x.post_id === id).length;
  const liked = new Set((mine.data ?? []).map((x) => x.post_id));
  const saved = new Set((saves.data ?? []).map((x) => x.item_id));
  const fol = new Set((follows.data ?? []).map((x) => x.following_id));
  const code = new Map((affs.data ?? []).map((a) => [a.user_id, a.code]));
  return rows.map((r) => {
    const p = ppl.get(r.user_id);
    return {
      id: r.id, creatorId: r.user_id, username: p?.username ?? null, name: p?.name ?? "ZANKYO member", avatarUrl: p?.avatarUrl ?? null,
      creatorCode: code.get(r.user_id) ?? null, following: fol.has(r.user_id), caption: r.caption, createdAt: r.created_at,
      media: [...r.post_media].sort((a, b) => a.position - b.position).map((m) => ({ url: urls.get(m.path) ?? "", thumb: urls.get(m.thumb_path) ?? "", w: m.width, h: m.height })),
      likes: count(likes.data, r.id), liked: liked.has(r.id), saved: saved.has(r.id), comments: count(comments.data, r.id),
      products: chips(r.post_products),
    };
  });
}

type ReelRow = { id: string; user_id: string; video_path: string; caption: string; views: number; created_at: string; reel_products: ProdRow[] };
const REEL_SELECT = `id, user_id, video_path, caption, views, created_at, reel_products(${PROD})`;
async function toReels(sb: Db, rows: ReelRow[]): Promise<ReelTile[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const h = await helpers();
  const [ppl, urls, votes, comments] = await Promise.all([
    h.people(sb, rows.map((r) => r.user_id)),
    h.signed(sb, "reels", rows.map((r) => r.video_path)),
    sb.from("reel_votes").select("reel_id").in("reel_id", ids).eq("value", 1),
    sb.from("reel_comments").select("reel_id").in("reel_id", ids).eq("hidden", false),
  ]);
  return rows.map((r) => {
    const p = ppl.get(r.user_id);
    return {
      id: r.id, videoUrl: urls.get(r.video_path) ?? "", caption: r.caption, creatorId: r.user_id, username: p?.username ?? null,
      name: p?.name ?? "ZANKYO member", avatarUrl: p?.avatarUrl ?? null, views: r.views, createdAt: r.created_at,
      likes: (votes.data ?? []).filter((v) => v.reel_id === r.id).length,
      comments: (comments.data ?? []).filter((c) => c.reel_id === r.id).length,
      products: chips(r.reel_products),
    };
  });
}

// ---------- Feed (photos + reels, weighted shuffle) ----------
export const listSocialFeed = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ seen: z.array(z.string()).max(600).default([]) }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const sb = await db();
    const me = await viewer(sb);
    const [posts, reels, follows, blocked] = await Promise.all([
      sb.from("posts").select("id, user_id, priority, created_at").eq("status", "live").order("created_at", { ascending: false }).limit(400),
      sb.from("reels").select("id, user_id, priority, created_at").eq("status", "live").order("created_at", { ascending: false }).limit(200),
      me ? sb.from("follows").select("following_id").eq("follower_id", me) : Promise.resolve({ data: [] as Array<{ following_id: string }> }),
      (await import("./account.server")).hiddenCreators(sb),
    ]);
    const followed = new Set((follows.data ?? []).map((f) => f.following_id));
    const seen = new Set(data.seen);
    const pool = [
      ...(posts.data ?? []).map((r) => ({ ...r, key: `p:${r.id}` })),
      ...(reels.data ?? []).map((r) => ({ ...r, key: `r:${r.id}` })),
    ].filter((r) => !seen.has(r.key) && !blocked.has(r.user_id));
    const { data: cr } = await sb.from("profiles").select("id, feed_priority").in("id", [...new Set(pool.map((r) => r.user_id))].concat("00000000-0000-0000-0000-000000000000"));
    const cp = new Map((cr ?? []).map((c) => [c.id, c.feed_priority]));
    const now = Date.now();
    const ranked = pool
      .map((r) => ({ key: r.key, w: feedWeight({ followed: followed.has(r.user_id), reelPriority: r.priority, creatorPriority: cp.get(r.user_id) ?? 1, ageHours: (now - Date.parse(r.created_at)) / 36e5 }) }))
      .filter((r) => r.w > 0)
      .map((r) => ({ key: r.key, k: Math.pow(Math.random(), 1 / r.w) }))
      .sort((a, b) => b.k - a.k);
    const pick = ranked.slice(0, PAGE_SIZE).map((r) => r.key);
    const postIds = pick.filter((k) => k.startsWith("p:")).map((k) => k.slice(2));
    const reelIds = pick.filter((k) => k.startsWith("r:")).map((k) => k.slice(2));
    const [pf, rf] = await Promise.all([
      postIds.length ? sb.from("posts").select(POST_SELECT).in("id", postIds) : Promise.resolve({ data: [] }),
      reelIds.length ? sb.from("reels").select(REEL_SELECT).in("id", reelIds) : Promise.resolve({ data: [] }),
    ]);
    const pc = new Map((await toPosts(sb, (pf.data ?? []) as unknown as PostRow[], me)).map((p) => [p.id, p]));
    const rc = new Map((await toReels(sb, (rf.data ?? []) as unknown as ReelRow[])).map((r) => [r.id, r]));
    const items: Array<FeedItem & { key: string }> = pick.flatMap((k) => {
      const id = k.slice(2);
      if (k.startsWith("p:")) { const post = pc.get(id); return post ? [{ type: "post" as const, post, key: k }] : []; }
      const reel = rc.get(id); return reel ? [{ type: "reel" as const, reel, key: k }] : [];
    });
    return { items, more: ranked.length > PAGE_SIZE };
  });

export const getPost = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    const me = await viewer(sb);
    const { data: row } = await sb.from("posts").select(`${POST_SELECT}, status`).eq("id", data.id).maybeSingle();
    if (!row || (row.status !== "live" && row.user_id !== me)) return null;
    const blocked = await (await import("./account.server")).hiddenCreators(sb);
    if (blocked.has(row.user_id) && row.user_id !== me) return null;
    return (await toPosts(sb, [row as unknown as PostRow], me))[0] ?? null;
  });

// ---------- Creating posts ----------
export const createPostUploads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ count: z.number().int().min(1).max(MAX_POST_PHOTOS) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    await assertActive(sb, context.userId);
    const out: Array<{ path: string; token: string; thumbPath: string; thumbToken: string }> = [];
    for (let i = 0; i < data.count; i++) {
      const id = crypto.randomUUID();
      const path = `${context.userId}/${id}.webp`;
      const thumbPath = `${context.userId}/${id}_t.webp`;
      const [a, b] = await Promise.all([sb.storage.from("posts").createSignedUploadUrl(path), sb.storage.from("posts").createSignedUploadUrl(thumbPath)]);
      if (!a.data || !b.data) throw new Error("Couldn't start the upload");
      out.push({ path, token: a.data.token, thumbPath, thumbToken: b.data.token });
    }
    return out;
  });

export const publishPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    photos: z.array(z.object({ path: z.string().max(200), thumbPath: z.string().max(200), w: z.number().int().min(0).max(10000), h: z.number().int().min(0).max(10000) })).min(1).max(MAX_POST_PHOTOS, `A post can have at most ${MAX_POST_PHOTOS} photos`),
    caption: z.string().trim().max(2200).default(""),
    productIds: z.array(z.string().uuid()).max(MAX_POST_PRODUCTS).default([]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    await assertActive(sb, context.userId);
    const mine = `${context.userId}/`;
    if (data.photos.some((p) => !p.path.startsWith(mine) || !p.thumbPath.startsWith(mine) || p.path.includes("..") || p.thumbPath.includes(".."))) throw new Error("Upload not found");
    const { data: files } = await sb.storage.from("posts").list(context.userId, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
    const sizes = new Map((files ?? []).map((f) => [`${mine}${f.name}`, Number((f.metadata as { size?: number } | null)?.size ?? 0)]));
    for (const p of data.photos) {
      const s = sizes.get(p.path);
      if (!s || !sizes.get(p.thumbPath)) throw new Error("A photo didn't finish uploading — please try again");
      if (s > MAX_PHOTO_BYTES) throw new Error("A photo is too large");
    }
    const { data: post, error } = await sb.from("posts").insert({ user_id: context.userId, caption: data.caption }).select("id").single();
    if (error || !post) throw new Error("Couldn't publish your post");
    await sb.from("post_media").insert(data.photos.map((p, position) => ({ post_id: post.id, path: p.path, thumb_path: p.thumbPath, width: p.w, height: p.h, position })));
    if (data.productIds.length) await sb.from("post_products").insert(data.productIds.map((product_id, position) => ({ post_id: post.id, product_id, position })));
    return { id: post.id };
  });

export const deleteMyPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    const { data: media } = await sb.from("post_media").select("path, thumb_path, posts!inner(user_id)").eq("post_id", data.id).eq("posts.user_id", context.userId);
    const { error } = await sb.from("posts").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error("Couldn't delete");
    if (media?.length) await sb.storage.from("posts").remove(media.flatMap((m) => [m.path, m.thumb_path]));
    return { ok: true };
  });

// ---------- Likes, comments, saves ----------
export const likePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), like: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    await assertActive(sb, context.userId);
    if (data.like) await sb.from("post_likes").upsert({ post_id: data.id, user_id: context.userId }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
    else await sb.from("post_likes").delete().eq("post_id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

export const toggleSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ kind: z.enum(["post", "reel"]), id: z.string().uuid(), save: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    if (data.save) await sb.from("saves").upsert({ user_id: context.userId, kind: data.kind, item_id: data.id }, { onConflict: "user_id,kind,item_id", ignoreDuplicates: true });
    else await sb.from("saves").delete().eq("user_id", context.userId).eq("kind", data.kind).eq("item_id", data.id);
    return { ok: true };
  });

export const listPostComments = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    const { data: rows } = await sb.from("post_comments").select("id, user_id, body, created_at").eq("post_id", data.id).eq("hidden", false).order("created_at").limit(300);
    const blocked = await (await import("./account.server")).hiddenCreators(sb);
    const ppl = await (await helpers()).people(sb, (rows ?? []).map((r) => r.user_id));
    return (rows ?? []).filter((r) => !blocked.has(r.user_id)).map((r) => ({ id: r.id, userId: r.user_id, body: r.body, createdAt: r.created_at, name: ppl.get(r.user_id)?.name ?? "ZANKYO member", username: ppl.get(r.user_id)?.username ?? null, avatarUrl: ppl.get(r.user_id)?.avatarUrl ?? null }));
  });

export const addPostComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), body: z.string().trim().min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    await assertActive(sb, context.userId);
    const { error } = await sb.from("post_comments").insert({ post_id: data.id, user_id: context.userId, body: data.body });
    if (error) throw new Error("Couldn't post your comment");
    return { ok: true };
  });

export const deletePostComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    const { data: c } = await sb.from("post_comments").select("user_id, posts(user_id)").eq("id", data.id).maybeSingle();
    const owner = (c?.posts as { user_id: string } | null)?.user_id;
    if (!c || (c.user_id !== context.userId && owner !== context.userId)) throw new Error("Not allowed");
    await sb.from("post_comments").delete().eq("id", data.id);
    return { ok: true };
  });

// ---------- Profile grids ----------
export const profileGrid = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ userId: z.string().uuid(), tab: z.enum(["posts", "reels", "tagged", "saved"]) }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    const me = await viewer(sb);
    const h = await helpers();
    type Tile = { kind: "post" | "reel"; id: string; thumb: string; videoUrl?: string; count?: number; views?: number };
    if (data.tab === "saved" && me !== data.userId) return { tiles: [] as Tile[], products: [] as ProductChip[] };
    if (data.tab === "tagged") {
      const [pp, rp] = await Promise.all([
        sb.from("post_products").select(`${PROD}, posts!inner(user_id, status)`).eq("posts.user_id", data.userId).eq("posts.status", "live").limit(200),
        sb.from("reel_products").select(`${PROD}, reels!inner(user_id, status)`).eq("reels.user_id", data.userId).eq("reels.status", "live").limit(200),
      ]);
      const all = chips([...(pp.data ?? []), ...(rp.data ?? [])] as unknown as ProdRow[]);
      return { tiles: [] as Tile[], products: [...new Map(all.map((p) => [p.id, p])).values()] };
    }
    let postIds: string[] = []; let reelIds: string[] = [];
    if (data.tab === "saved") {
      const { data: s } = await sb.from("saves").select("kind, item_id").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(90);
      postIds = (s ?? []).filter((x) => x.kind === "post").map((x) => x.item_id);
      reelIds = (s ?? []).filter((x) => x.kind === "reel").map((x) => x.item_id);
    }
    const tiles: Tile[] = [];
    if (data.tab === "posts" || postIds.length) {
      let q = sb.from("posts").select("id, created_at, post_media(thumb_path, position)").eq("status", "live").order("created_at", { ascending: false }).limit(90);
      q = data.tab === "posts" ? q.eq("user_id", data.userId) : q.in("id", postIds);
      const { data: rows } = await q;
      const firsts = (rows ?? []).map((r) => [...r.post_media].sort((a, b) => a.position - b.position)[0]?.thumb_path ?? "");
      const urls = await h.signed(sb, "posts", firsts.filter(Boolean));
      (rows ?? []).forEach((r, i) => tiles.push({ kind: "post", id: r.id, thumb: urls.get(firsts[i]!) ?? "", count: r.post_media.length }));
    }
    if (data.tab === "reels" || reelIds.length) {
      let q = sb.from("reels").select("id, video_path, views").eq("status", "live").order("created_at", { ascending: false }).limit(90);
      q = data.tab === "reels" ? q.eq("user_id", data.userId) : q.in("id", reelIds);
      const { data: rows } = await q;
      const urls = await h.signed(sb, "reels", (rows ?? []).map((r) => r.video_path));
      (rows ?? []).forEach((r) => tiles.push({ kind: "reel", id: r.id, thumb: "", videoUrl: urls.get(r.video_path) ?? "", views: r.views }));
    }
    return { tiles, products: [] as ProductChip[] };
  });

export const profileCounts = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    const { count } = await sb.from("posts").select("id", { count: "exact", head: true }).eq("user_id", data.userId).eq("status", "live");
    return { posts: count ?? 0 };
  });

// ---------- Notifications ----------
export const listNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ before: z.string().datetime({ offset: true }).optional().nullable() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const sb = await db();
    let q = sb.from("notifications").select("id, actor_id, kind, post_id, reel_id, body, read_at, created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(30);
    if (data.before) q = q.lt("created_at", data.before);
    const { data: rows } = await q;
    const ppl = await (await helpers()).people(sb, (rows ?? []).map((r) => r.actor_id));
    return {
      items: (rows ?? []).map((r) => ({ id: r.id, kind: r.kind, postId: r.post_id, reelId: r.reel_id, body: r.body, read: !!r.read_at, createdAt: r.created_at, actor: r.actor_id ? ppl.get(r.actor_id) ?? null : null })),
      more: (rows ?? []).length === 30,
    };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await db();
    await sb.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", context.userId).is("read_at", null);
    return { ok: true };
  });

export const socialBadges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await db();
    const me = context.userId;
    const [n, convs] = await Promise.all([
      sb.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", me).is("read_at", null),
      sb.from("conversations").select("id").or(`user_a.eq.${me},user_b.eq.${me}`).limit(500),
    ]);
    const ids = (convs.data ?? []).map((c) => c.id);
    const m = ids.length ? await sb.from("messages").select("conversation_id").in("conversation_id", ids).neq("sender_id", me).is("read_at", null).limit(500) : { data: [] };
    return { notifications: n.count ?? 0, chats: new Set((m.data ?? []).map((x) => x.conversation_id)).size };
  });

// ---------- Messages ----------
async function myConversation(sb: Db, id: string, me: string) {
  const { data } = await sb.from("conversations").select("id, user_a, user_b").eq("id", id).maybeSingle();
  if (!data || (data.user_a !== me && data.user_b !== me)) throw new Error("Chat not found");
  return { ...data, other: data.user_a === me ? data.user_b : data.user_a };
}

export const listConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await db();
    const me = context.userId;
    const { data: convs } = await sb.from("conversations").select("id, user_a, user_b, last_message_at").or(`user_a.eq.${me},user_b.eq.${me}`).order("last_message_at", { ascending: false }).limit(100);
    const list = convs ?? [];
    const others = list.map((c) => (c.user_a === me ? c.user_b : c.user_a));
    const ids = list.map((c) => c.id);
    const [ppl, msgs] = await Promise.all([
      (await helpers()).people(sb, others),
      ids.length ? sb.from("messages").select("conversation_id, sender_id, body, image_path, shared, read_at, created_at").in("conversation_id", ids).order("created_at", { ascending: false }).limit(1000) : Promise.resolve({ data: [] }),
    ]);
    type M = { conversation_id: string; sender_id: string; body: string; image_path: string | null; shared: unknown; read_at: string | null; created_at: string };
    const all = (msgs.data ?? []) as M[];
    return list.flatMap((c, i) => {
      const last = all.find((m) => m.conversation_id === c.id);
      if (!last) return [];
      const unread = all.filter((m) => m.conversation_id === c.id && m.sender_id !== me && !m.read_at).length;
      const preview = last.body || (last.image_path ? "Photo" : last.shared ? "Shared a post" : "");
      return [{ id: c.id, other: ppl.get(others[i]!) ?? { id: others[i]!, name: "ZANKYO member", username: null, avatarUrl: null }, preview: (last.sender_id === me ? "You: " : "") + preview, at: last.created_at, unread }];
    });
  });

export const openConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("You can't message yourself");
    const sb = await db();
    const [a, b] = pairOf(context.userId, data.userId);
    const { data: existing } = await sb.from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
    if (existing) return { id: existing.id };
    const { data: created, error } = await sb.from("conversations").insert({ user_a: a, user_b: b }).select("id").single();
    if (error || !created) throw new Error("Couldn't open the chat");
    return { id: created.id };
  });

export const getConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), before: z.string().datetime({ offset: true }).optional().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    const c = await myConversation(sb, data.id, context.userId);
    let q = sb.from("messages").select("id, sender_id, body, image_path, shared, read_at, created_at").eq("conversation_id", c.id).order("created_at", { ascending: false }).limit(40);
    if (data.before) q = q.lt("created_at", data.before);
    const h = await helpers();
    const [{ data: rows }, ppl, blocks] = await Promise.all([
      q,
      h.people(sb, [c.other]),
      sb.from("blocks").select("blocker_id").eq("blocker_id", context.userId).eq("blocked_id", c.other).maybeSingle(),
    ]);
    const msgs = (rows ?? []).reverse();
    const urls = await h.signed(sb, "posts", msgs.flatMap((m) => (m.image_path ? [m.image_path] : [])));
    return {
      id: c.id,
      other: ppl.get(c.other) ?? { id: c.other, name: "ZANKYO member", username: null, avatarUrl: null },
      iBlocked: !!blocks.data,
      more: (rows ?? []).length === 40,
      messages: msgs.map((m) => ({ id: m.id, mine: m.sender_id === context.userId, body: m.body, image: m.image_path ? urls.get(m.image_path) ?? null : null, shared: m.shared as SharedItem | null, read: !!m.read_at, createdAt: m.created_at })),
    };
  });

export type SharedItem = { kind: "post" | "reel" | "product"; id: string; title: string; href: string; image: string | null };

export const createChatImageUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    const c = await myConversation(sb, data.id, context.userId);
    const path = `chat/${c.id}/${context.userId}-${crypto.randomUUID()}.webp`;
    const { data: up } = await sb.storage.from("posts").createSignedUploadUrl(path);
    if (!up) throw new Error("Couldn't start the upload");
    return { path, token: up.token };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    body: z.string().trim().max(2000).default(""),
    imagePath: z.string().max(200).optional().nullable(),
    shared: z.object({ kind: z.enum(["post", "reel", "product"]), id: z.string().max(200), title: z.string().max(200), href: z.string().max(300).regex(/^\/[^/]/), image: z.string().url().max(2000).nullable() }).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    const c = await myConversation(sb, data.id, context.userId);
    if (!data.body && !data.imagePath && !data.shared) throw new Error("Write a message");
    if (data.imagePath && !data.imagePath.startsWith(`chat/${c.id}/${context.userId}-`)) throw new Error("Upload not found");
    const h = await helpers();
    const [{ data: meP }, { data: other }, blocked, follows] = await Promise.all([
      sb.from("profiles").select("account_status").eq("id", context.userId).maybeSingle(),
      sb.from("profiles").select("dm_followers_only").eq("id", c.other).maybeSingle(),
      h.isBlockedEitherWay(sb, context.userId, c.other),
      sb.from("follows").select("follower_id").eq("follower_id", c.other).eq("following_id", context.userId).maybeSingle(),
    ]);
    if (!canMessage({ senderStatus: meP?.account_status, blocked, recipientFollowersOnly: !!other?.dm_followers_only, recipientFollowsSender: !!follows.data })) {
      throw new Error(blocked ? "You can't message this person." : meP?.account_status === "active" ? "This person only accepts messages from people they follow." : "Your account can't send messages.");
    }
    const now = new Date().toISOString();
    const { data: msg, error } = await sb.from("messages").insert({ conversation_id: c.id, sender_id: context.userId, body: data.body, image_path: data.imagePath ?? null, shared: data.shared ?? null }).select("id").single();
    if (error || !msg) throw new Error("Couldn't send");
    await sb.from("conversations").update({ last_message_at: now }).eq("id", c.id);
    return { id: msg.id };
  });

export const markChatRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    const c = await myConversation(sb, data.id, context.userId);
    await sb.from("messages").update({ read_at: new Date().toISOString() }).eq("conversation_id", c.id).neq("sender_id", context.userId).is("read_at", null);
    return { ok: true };
  });

export const setBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), block: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    if (data.block) {
      await sb.from("blocks").upsert({ blocker_id: context.userId, blocked_id: data.userId }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });
      await sb.from("follows").delete().eq("follower_id", data.userId).eq("following_id", context.userId);
    } else await sb.from("blocks").delete().eq("blocker_id", context.userId).eq("blocked_id", data.userId);
    return { ok: true };
  });

export const reportConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), reason: z.string().trim().min(3).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    const c = await myConversation(sb, data.id, context.userId);
    await sb.from("message_reports").insert({ conversation_id: c.id, reporter_id: context.userId, reason: data.reason });
    return { ok: true };
  });

export const getDmPrivacy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await db();
    const { data } = await sb.from("profiles").select("dm_followers_only").eq("id", context.userId).maybeSingle();
    return { followersOnly: !!data?.dm_followers_only };
  });

export const setDmPrivacy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ followersOnly: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    await sb.from("profiles").update({ dm_followers_only: data.followersOnly }).eq("id", context.userId);
    return { ok: true };
  });

// ---------- Admin ----------
async function staff(ctx: { userId: string; claims: Record<string, unknown> }, edit = false) {
  const { requireStaff } = await import("./admin/guard.server");
  return requireStaff(ctx, edit ? "community" : undefined);
}

export const adminSocialOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await staff(context);
    const sb = await db();
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const week = new Date(Date.now() - 7 * 864e5).toISOString();
    const [posts, postsWeek, likes, comments, msgs, convs, reports] = await Promise.all([
      sb.from("posts").select("id, status, user_id, created_at").limit(10000),
      sb.from("posts").select("id", { count: "exact", head: true }).gte("created_at", week),
      sb.from("post_likes").select("post_id", { count: "exact", head: true }),
      sb.from("post_comments").select("id", { count: "exact", head: true }),
      sb.from("messages").select("created_at, sender_id").gte("created_at", since).limit(20000),
      sb.from("conversations").select("id", { count: "exact", head: true }),
      sb.from("message_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    ]);
    const days: Array<{ day: string; posts: number; messages: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      days.push({ day: d, posts: (posts.data ?? []).filter((p) => p.created_at.startsWith(d)).length, messages: (msgs.data ?? []).filter((m) => m.created_at.startsWith(d)).length });
    }
    const activeUsers = new Set([...(msgs.data ?? []).filter((m) => m.created_at >= week).map((m) => m.sender_id), ...(posts.data ?? []).filter((p) => p.created_at >= week).map((p) => p.user_id)]).size;
    return {
      posts: (posts.data ?? []).length, live: (posts.data ?? []).filter((p) => p.status === "live").length, postsWeek: postsWeek.count ?? 0,
      likes: likes.count ?? 0, comments: comments.count ?? 0, messages30: (msgs.data ?? []).length, chats: convs.count ?? 0,
      openReports: reports.count ?? 0, activeUsers, days,
    };
  });

export const adminListPosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ status: z.enum(["all", "live", "hidden"]).default("all"), q: z.string().max(80).default("") }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await staff(context);
    const sb = await db();
    let q = sb.from("posts").select("id, user_id, caption, status, priority, created_at, post_media(thumb_path, position)").order("created_at", { ascending: false }).limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.q) q = q.ilike("caption", `%${data.q.replace(/[%_,()]/g, "")}%`);
    const { data: rows } = await q;
    const list = rows ?? [];
    const ids = list.map((r) => r.id);
    const h = await helpers();
    const firsts = list.map((r) => [...r.post_media].sort((a, b) => a.position - b.position)[0]?.thumb_path ?? "");
    const [ppl, urls, likes, comments] = await Promise.all([
      h.people(sb, list.map((r) => r.user_id)),
      h.signed(sb, "posts", firsts.filter(Boolean)),
      ids.length ? sb.from("post_likes").select("post_id").in("post_id", ids) : Promise.resolve({ data: [] }),
      ids.length ? sb.from("post_comments").select("post_id").in("post_id", ids) : Promise.resolve({ data: [] }),
    ]);
    return list.map((r, i) => ({
      id: r.id, caption: r.caption, status: r.status, priority: r.priority, createdAt: r.created_at, photos: r.post_media.length,
      thumb: urls.get(firsts[i]!) ?? "", creator: ppl.get(r.user_id)?.username ?? ppl.get(r.user_id)?.name ?? "—",
      likes: (likes.data ?? []).filter((x) => x.post_id === r.id).length, comments: (comments.data ?? []).filter((x) => x.post_id === r.id).length,
    }));
  });

export const adminModeratePosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ids: z.array(z.string().uuid()).min(1).max(200), action: z.enum(["hide", "show", "delete", "p0", "p1", "p2", "p4"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await staff(context, true);
    const sb = await db();
    if (data.action === "delete") {
      const { data: media } = await sb.from("post_media").select("path, thumb_path").in("post_id", data.ids);
      await sb.from("posts").delete().in("id", data.ids);
      if (media?.length) await sb.storage.from("posts").remove(media.flatMap((m) => [m.path, m.thumb_path]));
    } else if (data.action === "hide" || data.action === "show") {
      await sb.from("posts").update({ status: data.action === "hide" ? "hidden" : "live" }).in("id", data.ids);
    } else {
      await sb.from("posts").update({ priority: Number(data.action.slice(1)) }).in("id", data.ids);
    }
    return { ok: true };
  });

export const adminReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await staff(context);
    const sb = await db();
    const { data: rows } = await sb.from("message_reports").select("id, conversation_id, reporter_id, reason, status, created_at, conversations(user_a, user_b)").order("created_at", { ascending: false }).limit(200);
    const list = rows ?? [];
    const ppl = await (await helpers()).people(sb, list.flatMap((r) => { const c = r.conversations as { user_a: string; user_b: string } | null; return [r.reporter_id, c?.user_a, c?.user_b]; }));
    const label = (id?: string) => (id ? ppl.get(id)?.username ?? ppl.get(id)?.name ?? "member" : "—");
    return list.map((r) => {
      const c = r.conversations as { user_a: string; user_b: string } | null;
      const reported = c ? (c.user_a === r.reporter_id ? c.user_b : c.user_a) : undefined;
      return { id: r.id, conversationId: r.conversation_id, reason: r.reason, status: r.status, createdAt: r.created_at, reporter: label(r.reporter_id), reported: label(reported), reportedId: reported ?? null };
    });
  });

/** Staff read a chat only when one of its members reported it. */
export const adminReportedChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ reportId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await staff(context);
    const sb = await db();
    const { data: r } = await sb.from("message_reports").select("conversation_id").eq("id", data.reportId).maybeSingle();
    if (!r) throw new Error("Report not found");
    const { data: msgs } = await sb.from("messages").select("id, sender_id, body, image_path, created_at").eq("conversation_id", r.conversation_id).order("created_at", { ascending: false }).limit(100);
    const ppl = await (await helpers()).people(sb, (msgs ?? []).map((m) => m.sender_id));
    return (msgs ?? []).reverse().map((m) => ({ id: m.id, from: ppl.get(m.sender_id)?.username ?? ppl.get(m.sender_id)?.name ?? "member", body: m.body || (m.image_path ? "[photo]" : "[shared item]"), createdAt: m.created_at }));
  });

export const adminResolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await staff(context, true);
    const sb = await db();
    await sb.from("message_reports").update({ status: "resolved" }).eq("id", data.id);
    return { ok: true };
  });

export const adminBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ body: z.string().trim().min(3).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    await staff(context, true);
    const sb = await db();
    const { data: n, error } = await sb.rpc("broadcast_notification", { _body: data.body });
    if (error) throw new Error("Couldn't send");
    return { sent: n ?? 0 };
  });
