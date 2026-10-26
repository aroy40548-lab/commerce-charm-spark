import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAX_REEL_SECONDS, MAX_REEL_BYTES, REEL_TYPES, publicName, feedWeight } from "@/lib/reels";

async function db() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}
type Db = Awaited<ReturnType<typeof db>>;

async function namesFor(sb: Db, ids: string[]) {
  return new Map([...(await peopleFor(sb, ids))].map(([k, v]) => [k, v.name]));
}

type Person = { name: string; username: string | null; avatarUrl: string | null; priority: number };
async function peopleFor(sb: Db, ids: string[]) {
  const map = new Map<string, Person>();
  if (!ids.length) return map;
  const { data } = await sb.from("profiles").select("id, full_name, first_name, last_name, username, avatar_path, feed_priority").in("id", [...new Set(ids)]);
  const urls = await (await import("./profile.server")).avatarUrls(sb, (data ?? []).map((p) => p.avatar_path));
  data?.forEach((p) => map.set(p.id, {
    name: p.full_name?.trim() || publicName(p),
    username: p.username && !p.username.includes("@") ? p.username : null,
    avatarUrl: p.avatar_path ? urls.get(p.avatar_path) ?? null : null,
    priority: p.feed_priority,
  }));
  return map;
}

export interface ReelCard {
  id: string;
  videoUrl: string;
  caption: string;
  creator: string;
  creatorCode: string | null;
  creatorId: string;
  username: string | null;
  avatarUrl: string | null;
  following: boolean;
  likes: number;
  dislikes: number;
  comments: number;
  views: number;
  createdAt: string;
  products: Array<{ id: string; handle: string; title: string; price: number; image: string | null }>;
}

const REEL_SELECT =
  "id, user_id, video_path, caption, views, created_at, reel_products(position, products(id, handle, title, price, status, product_images(url, position)))";

type ReelRow = {
  id: string; user_id: string; video_path: string; caption: string; views: number; created_at: string;
  reel_products: Array<{ position: number; products: { id: string; handle: string; title: string; price: number; status: string; product_images: Array<{ url: string; position: number }> } | null }>;
};

async function toCards(sb: Db, rows: ReelRow[], followed: Set<string> = new Set()): Promise<ReelCard[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const users = rows.map((r) => r.user_id);
  const [names, votes, comments, affs, signed] = await Promise.all([
    peopleFor(sb, users),
    sb.from("reel_votes").select("reel_id, value").in("reel_id", ids),
    sb.from("reel_comments").select("reel_id").in("reel_id", ids).eq("hidden", false),
    sb.from("affiliates").select("user_id, code").in("user_id", users).eq("status", "active"),
    sb.storage.from("reels").createSignedUrls(rows.map((r) => r.video_path), 60 * 60 * 6),
  ]);
  const urlFor = new Map((signed.data ?? []).map((s) => [s.path, s.signedUrl]));
  const code = new Map((affs.data ?? []).map((a) => [a.user_id, a.code]));
  return rows.map((r) => ({
    id: r.id,
    videoUrl: urlFor.get(r.video_path) ?? "",
    caption: r.caption,
    creator: names.get(r.user_id)?.username ?? names.get(r.user_id)?.name ?? "ZANKYO member",
    creatorCode: code.get(r.user_id) ?? null,
    creatorId: r.user_id,
    username: names.get(r.user_id)?.username ?? null,
    avatarUrl: names.get(r.user_id)?.avatarUrl ?? null,
    following: followed.has(r.user_id),
    likes: (votes.data ?? []).filter((v) => v.reel_id === r.id && v.value === 1).length,
    dislikes: (votes.data ?? []).filter((v) => v.reel_id === r.id && v.value === -1).length,
    comments: (comments.data ?? []).filter((c) => c.reel_id === r.id).length,
    views: r.views,
    createdAt: r.created_at,
    products: [...r.reel_products]
      .sort((a, b) => a.position - b.position)
      .flatMap((rp) => (rp.products && rp.products.status === "active" ? [rp.products] : []))
      .map((p) => ({
        id: p.id, handle: p.handle, title: p.title, price: Number(p.price),
        image: [...p.product_images].sort((a, b) => a.position - b.position)[0]?.url ?? null,
      })),
  }));
}

// ---------- Public feed (weighted shuffle) ----------
export const listReels = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ seen: z.array(z.string().uuid()).max(400).default([]), startId: z.string().uuid().optional().nullable() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const sb = await db();
    const me = await (await import("./profile.server")).viewerId(sb);
    const [{ data: pool }, follows] = await Promise.all([
      sb.from("reels").select("id, user_id, priority, created_at").eq("status", "live").order("created_at", { ascending: false }).limit(500),
      me ? sb.from("follows").select("following_id").eq("follower_id", me) : Promise.resolve({ data: [] as Array<{ following_id: string }> }),
    ]);
    const followed = new Set((follows.data ?? []).map((f) => f.following_id));
    const seen = new Set(data.seen);
    const rows = (pool ?? []).filter((r) => !seen.has(r.id) && r.id !== data.startId);
    const { data: creators } = await sb.from("profiles").select("id, feed_priority").in("id", [...new Set(rows.map((r) => r.user_id))].concat("00000000-0000-0000-0000-000000000000"));
    const cp = new Map((creators ?? []).map((c) => [c.id, c.feed_priority]));
    const now = Date.now();
    const ranked = rows
      .map((r) => ({ id: r.id, w: feedWeight({ followed: followed.has(r.user_id), reelPriority: r.priority, creatorPriority: cp.get(r.user_id) ?? 1, ageHours: (now - Date.parse(r.created_at)) / 36e5 }) }))
      .filter((r) => r.w > 0)
      .map((r) => ({ id: r.id, k: Math.pow(Math.random(), 1 / r.w) }))
      .sort((a, b) => b.k - a.k);
    const pick = ranked.slice(0, 8).map((r) => r.id);
    if (data.startId && !data.seen.length) pick.unshift(data.startId);
    if (!pick.length) return { reels: [] as ReelCard[], more: false };
    const { data: full } = await sb.from("reels").select(REEL_SELECT).in("id", pick).eq("status", "live");
    const byId = new Map(((full ?? []) as unknown as ReelRow[]).map((r) => [r.id, r]));
    const ordered = pick.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
    return { reels: await toCards(sb, ordered, followed), more: ranked.length > 8 };
  });

export const viewReel = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    await sb.rpc("increment_reel_views", { _reel_id: data.id });
    return { ok: true };
  });

export const getMyVotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ids: z.array(z.string().uuid()).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!data.ids.length) return {} as Record<string, number>;
    const sb = await db();
    const { data: rows } = await sb.from("reel_votes").select("reel_id, value").eq("user_id", context.userId).in("reel_id", data.ids);
    return Object.fromEntries((rows ?? []).map((r) => [r.reel_id, r.value])) as Record<string, number>;
  });

/** value 1 = like, -1 = dislike, 0 = remove my vote. One vote per person per reel. */
export const voteReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), value: z.union([z.literal(1), z.literal(-1), z.literal(0)]) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    if (data.value === 0) {
      await sb.from("reel_votes").delete().eq("reel_id", data.id).eq("user_id", context.userId);
    } else {
      const { error } = await sb.from("reel_votes").upsert({ reel_id: data.id, user_id: context.userId, value: data.value }, { onConflict: "reel_id,user_id" });
      if (error) throw new Error("Couldn't save your vote");
    }
    return { ok: true };
  });

// ---------- Comments ----------
export const listReelComments = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    const { data: rows } = await sb.from("reel_comments").select("id, user_id, body, created_at")
      .eq("reel_id", data.id).eq("hidden", false).order("created_at", { ascending: false }).limit(200);
    const names = await namesFor(sb, (rows ?? []).map((r) => r.user_id));
    // user_id is only returned so the author can see a delete button; never an email.
    return (rows ?? []).map((r) => ({ id: r.id, userId: r.user_id, name: names.get(r.user_id) ?? "ZANKYO member", body: r.body, createdAt: r.created_at }));
  });

export const addReelComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), body: z.string().trim().min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    const { data: reel } = await sb.from("reels").select("id").eq("id", data.id).eq("status", "live").maybeSingle();
    if (!reel) throw new Error("This reel isn't available");
    const { error } = await sb.from("reel_comments").insert({ reel_id: data.id, user_id: context.userId, body: data.body });
    if (error) throw new Error("Couldn't post your comment");
    return { ok: true };
  });

export const deleteReelComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    await sb.from("reel_comments").delete().eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

// ---------- Creator studio ----------
async function ensureAffiliate(sb: Db, userId: string, email: string) {
  const { data: existing } = await sb.from("affiliates").select("id").eq("user_id", userId).maybeSingle();
  if (existing) return;
  const { getSettings } = await import("./store.server");
  if (!(await getSettings()).affiliates_enabled) return;
  const { data: profile } = await sb.from("profiles").select("first_name, last_name").eq("id", userId).maybeSingle();
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || email.split("@")[0] || "";
  const base = (profile?.first_name || email.split("@")[0] || "ZK").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "ZK";
  for (let i = 0; i < 6; i++) {
    const { error } = await sb.from("affiliates").insert({ user_id: userId, email, name, code: `${base}${Math.floor(100 + Math.random() * 900)}` });
    if (!error) return;
  }
}

const meta = z.object({
  type: z.enum(REEL_TYPES),
  size: z.number().int().min(1).max(MAX_REEL_BYTES),
  duration: z.number().positive().max(MAX_REEL_SECONDS + 0.5),
});

export const createReelUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => meta.parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    const ext = data.type === "video/webm" ? "webm" : data.type === "video/quicktime" ? "mov" : "mp4";
    const path = `${context.userId}/${crypto.randomUUID()}.${ext}`;
    const { data: up, error } = await sb.storage.from("reels").createSignedUploadUrl(path);
    if (error || !up) throw new Error("Couldn't start the upload");
    return { path, token: up.token };
  });

export const publishReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      path: z.string().max(200),
      caption: z.string().trim().max(300).default(""),
      duration: z.number().positive().max(MAX_REEL_SECONDS + 0.5),
      productIds: z.array(z.string().uuid()).max(5).default([]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = await db();
    if (!data.path.startsWith(`${context.userId}/`) || data.path.includes("..")) throw new Error("Upload not found");
    const [folder, file] = data.path.split("/");
    const { data: files } = await sb.storage.from("reels").list(folder, { search: file ?? "" });
    const obj = files?.find((f) => f.name === file);
    const size = Number((obj?.metadata as { size?: number } | undefined)?.size ?? 0);
    if (!obj) throw new Error("Upload not found — please try again");
    if (size > MAX_REEL_BYTES) {
      await sb.storage.from("reels").remove([data.path]);
      throw new Error("Video is too large (max 50MB)");
    }
    const { data: reel, error } = await sb.from("reels")
      .insert({ user_id: context.userId, video_path: data.path, caption: data.caption, duration: data.duration })
      .select("id").single();
    if (error) throw new Error(error.message.includes("duration") ? `Reels must be ${MAX_REEL_SECONDS} seconds or shorter` : "Couldn't publish your reel");
    if (data.productIds.length) {
      await sb.from("reel_products").insert(data.productIds.map((product_id, position) => ({ reel_id: reel.id, product_id, position })));
    }
    await ensureAffiliate(sb, context.userId, String((context.claims as { email?: string }).email ?? ""));
    return { id: reel.id };
  });

export const listMyReels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await db();
    const { data: rows } = await sb.from("reels").select(REEL_SELECT + ", status").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(100);
    const list = (rows ?? []) as unknown as ReelRow[];
    const cards = await toCards(sb, list);
    const { data: aff } = await sb.from("affiliates").select("id").eq("user_id", context.userId).maybeSingle();
    const earned = new Map<string, number>();
    if (aff && list.length) {
      const { data: com } = await sb.from("affiliate_commissions").select("reel_id, amount, status").eq("affiliate_id", aff.id).in("reel_id", list.map((r) => r.id));
      com?.forEach((c) => c.reel_id && c.status !== "rejected" && earned.set(c.reel_id, (earned.get(c.reel_id) ?? 0) + Number(c.amount)));
    }
    const status = new Map(((rows ?? []) as unknown as Array<{ id: string; status: string }>).map((r) => [r.id, r.status]));
    return cards.map((c) => ({ ...c, earned: earned.get(c.id) ?? 0, hidden: status.get(c.id) === "hidden" }));
  });

export const updateMyReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), caption: z.string().trim().max(300), productIds: z.array(z.string().uuid()).max(5) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    const { data: reel } = await sb.from("reels").select("id").eq("id", data.id).eq("user_id", context.userId).maybeSingle();
    if (!reel) throw new Error("Reel not found");
    await sb.from("reels").update({ caption: data.caption }).eq("id", data.id);
    await sb.from("reel_products").delete().eq("reel_id", data.id);
    if (data.productIds.length) await sb.from("reel_products").insert(data.productIds.map((product_id, position) => ({ reel_id: data.id, product_id, position })));
    return { ok: true };
  });

export const deleteMyReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await db();
    const { data: reel } = await sb.from("reels").select("id, video_path").eq("id", data.id).eq("user_id", context.userId).maybeSingle();
    if (!reel) throw new Error("Reel not found");
    await sb.from("reels").delete().eq("id", reel.id);
    await sb.storage.from("reels").remove([reel.video_path]);
    return { ok: true };
  });

// ---------- Admin moderation ----------
export const adminListReels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireStaff } = await import("./admin/guard.server");
    await requireStaff(context);
    const sb = await db();
    const { data: rows } = await sb.from("reels").select(REEL_SELECT + ", status, priority").order("created_at", { ascending: false }).limit(200);
    const list = (rows ?? []) as unknown as Array<ReelRow & { status: string }>;
    const cards = await toCards(sb, list);
    const { data: comments } = await sb.from("reel_comments").select("id, reel_id, user_id, body, hidden, created_at")
      .in("reel_id", list.map((r) => r.id).concat("00000000-0000-0000-0000-000000000000")).order("created_at", { ascending: false }).limit(500);
    const names = await namesFor(sb, (comments ?? []).map((c) => c.user_id));
    const { data: cps } = await sb.from("profiles").select("id, feed_priority").in("id", cards.map((c) => c.creatorId).concat("00000000-0000-0000-0000-000000000000"));
    const creatorPrio = new Map((cps ?? []).map((p) => [p.id, p.feed_priority]));
    return cards.map((c, i) => ({
      ...c,
      status: list[i]!.status,
      priority: (list[i] as unknown as { priority: number }).priority,
      creatorPriority: creatorPrio.get(c.creatorId) ?? 1,
      commentList: (comments ?? []).filter((x) => x.reel_id === c.id).map((x) => ({ id: x.id, name: names.get(x.user_id) ?? "Member", body: x.body, hidden: x.hidden, createdAt: x.created_at })),
    }));
  });

export const adminModerateReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      action: z.enum(["hide", "show", "delete", "hideComment", "showComment", "deleteComment"]),
      id: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { requireStaff } = await import("./admin/guard.server");
    await requireStaff(context, "marketing");
    const sb = await db();
    if (data.action === "hide" || data.action === "show") await sb.from("reels").update({ status: data.action === "hide" ? "hidden" : "live" }).eq("id", data.id);
    if (data.action === "delete") {
      const { data: r } = await sb.from("reels").select("video_path").eq("id", data.id).maybeSingle();
      await sb.from("reels").delete().eq("id", data.id);
      if (r) await sb.storage.from("reels").remove([r.video_path]);
    }
    if (data.action === "hideComment" || data.action === "showComment") await sb.from("reel_comments").update({ hidden: data.action === "hideComment" }).eq("id", data.id);
    if (data.action === "deleteComment") await sb.from("reel_comments").delete().eq("id", data.id);
    return { ok: true };
  });

export const adminSetPriority = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ kind: z.enum(["reel", "creator"]), id: z.string().uuid(), value: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(4)]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { requireStaff } = await import("./admin/guard.server");
    await requireStaff(context, "marketing");
    const sb = await db();
    if (data.kind === "reel") await sb.from("reels").update({ priority: data.value }).eq("id", data.id);
    else await sb.from("profiles").update({ feed_priority: data.value }).eq("id", data.id);
    return { ok: true };
  });
