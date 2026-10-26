import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, Clapperboard, Heart, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ReelsFeed";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney } from "@/lib/catalog";
import { timeAgo } from "@/lib/social";
import { likePost, toggleSave, type PostCard as Post, type ProductChip, type ReelTile } from "@/lib/social.functions";

function needSignIn(what: string) {
  toast(`Sign in to ${what}`, { action: { label: "Sign in", onClick: () => (window.location.href = "/auth") } });
}

export function CreatorRow({ username, name, avatarUrl, at }: { username: string | null; name: string; avatarUrl: string | null; at: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {username ? (
        <Link to="/u/$username" params={{ username }} className="flex min-w-0 items-center gap-2">
          <Avatar url={avatarUrl} label={username} />
          <span className="truncate text-sm font-semibold">{username}</span>
        </Link>
      ) : (
        <span className="flex items-center gap-2"><Avatar url={avatarUrl} label={name} /><span className="text-sm font-semibold">{name}</span></span>
      )}
      <span className="text-xs text-muted-foreground">· {timeAgo(at)}</span>
    </div>
  );
}

export function ShopChip({ products }: { products: ProductChip[] }) {
  const p = products[0];
  if (!p) return null;
  return (
    <Link to="/product/$handle" params={{ handle: p.handle }} className="mx-3 mt-2 flex items-center gap-3 border border-border p-2 active:opacity-80">
      <div className="h-11 w-11 shrink-0 overflow-hidden bg-muted">{p.image && <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover" />}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{p.title}</p>
        <p className="text-xs text-muted-foreground">{formatMoney(p.price)}{products.length > 1 ? ` · +${products.length - 1} more` : ""}</p>
      </div>
      <span className="zk-label bg-accent px-2 py-1 text-[9px] text-accent-foreground">Shop this look</span>
    </Link>
  );
}

export function PostCardView({ post, eager = false }: { post: Post; eager?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likes);
  const [saved, setSaved] = useState(post.saved);
  const [idx, setIdx] = useState(0);
  const [heart, setHeart] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const last = useRef(0);
  const first = post.media[0];
  const ratio = first && first.w && first.h ? Math.min(1.25, Math.max(0.8, first.h / first.w)) : 1;

  const like = async (next: boolean) => {
    if (!user) return needSignIn("like posts");
    setLiked(next); setLikes((n) => n + (next ? 1 : -1));
    try { await likePost({ data: { id: post.id, like: next } }); }
    catch { setLiked(!next); setLikes((n) => n + (next ? -1 : 1)); toast.error("Couldn't save your like"); }
  };
  const save = async () => {
    if (!user) return needSignIn("save posts");
    const next = !saved; setSaved(next);
    try { await toggleSave({ data: { kind: "post", id: post.id, save: next } }); qc.invalidateQueries({ queryKey: ["grid"] }); }
    catch { setSaved(!next); }
  };
  const share = async () => {
    const url = `${window.location.origin}/p/${post.id}${post.creatorCode ? `?ref=${encodeURIComponent(post.creatorCode)}` : ""}`;
    try {
      if (navigator.share) { await navigator.share({ title: `ZANKYO post by @${post.username ?? post.name}`, url }); return; }
      await navigator.clipboard.writeText(url); toast.success("Link copied");
    } catch { /* cancelled */ }
  };
  const tap = () => {
    const now = Date.now();
    if (now - last.current < 280) { setHeart((h) => h + 1); if (!liked) void like(true); }
    last.current = now;
  };

  return (
    <article className="border-b border-border pb-3">
      <CreatorRow username={post.username} name={post.name} avatarUrl={post.avatarUrl} at={post.createdAt} />
      <div className="relative bg-muted" style={{ aspectRatio: `1 / ${ratio}` }} onClick={tap}>
        <div
          ref={strip}
          onScroll={(e) => setIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
        >
          {post.media.map((m, i) => (
            <img key={i} src={m.url} alt="" loading={eager && i === 0 ? "eager" : "lazy"} decoding="async" className="h-full w-full shrink-0 snap-center object-cover" />
          ))}
        </div>
        {post.media.length > 1 && (
          <>
            <span className="absolute right-2 top-2 bg-ink/70 px-2 py-0.5 text-[11px] font-semibold text-white">{idx + 1}/{post.media.length}</span>
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1">
              {post.media.map((_, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === idx ? "bg-accent" : "bg-white/60"}`} />)}
            </div>
          </>
        )}
        {heart > 0 && <Heart key={heart} className="zk-reel-heart pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 fill-accent text-accent" />}
      </div>
      <div className="flex items-center gap-1 px-1.5 pt-1">
        <button onClick={() => like(!liked)} aria-label="Like" aria-pressed={liked} className="grid h-11 w-11 place-items-center"><Heart className={`h-6 w-6 ${liked ? "fill-accent text-accent" : ""}`} /></button>
        <Link to="/p/$id" params={{ id: post.id }} aria-label="Comments" className="grid h-11 w-11 place-items-center"><MessageCircle className="h-6 w-6" /></Link>
        <button onClick={share} aria-label="Share" className="grid h-11 w-11 place-items-center"><Send className="h-6 w-6" /></button>
        <button onClick={save} aria-label="Save" aria-pressed={saved} className="ml-auto grid h-11 w-11 place-items-center"><Bookmark className={`h-6 w-6 ${saved ? "fill-foreground" : ""}`} /></button>
      </div>
      <p className="px-3 text-sm font-semibold">{likes} {likes === 1 ? "like" : "likes"}</p>
      {post.caption && <p className="whitespace-pre-line px-3 text-sm"><b>{post.username ?? post.name}</b> {post.caption}</p>}
      {post.comments > 0 && <Link to="/p/$id" params={{ id: post.id }} className="block px-3 pt-1 text-sm text-muted-foreground">View all {post.comments} comments</Link>}
      <ShopChip products={post.products} />
    </article>
  );
}

/** Reel inside the photo feed: plays silently when on screen, tap to open full screen. */
export function ReelTileView({ reel }: { reel: ReelTile }) {
  const box = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) { setNear(true); void vid.current?.play().catch(() => {}); } else vid.current?.pause();
    }, { threshold: 0.5, rootMargin: "200px 0px" });
    io.observe(el); return () => io.disconnect();
  }, []);
  return (
    <article ref={box} className="border-b border-border pb-3">
      <CreatorRow username={reel.username} name={reel.name} avatarUrl={reel.avatarUrl} at={reel.createdAt} />
      <Link to="/reels/$id" params={{ id: reel.id }} className="relative block aspect-[4/5] bg-ink">
        <video ref={vid} src={near ? reel.videoUrl : undefined} muted loop playsInline preload="none" className="h-full w-full object-cover" />
        <span className="zk-label absolute right-2 top-2 flex items-center gap-1 bg-ink/70 px-2 py-1 text-[9px] text-white"><Clapperboard className="h-3 w-3" /> Reel</span>
      </Link>
      <p className="px-3 pt-2 text-sm font-semibold">{reel.likes} likes · {reel.views} views</p>
      {reel.caption && <p className="px-3 text-sm"><b>{reel.username ?? reel.name}</b> {reel.caption}</p>}
      <ShopChip products={reel.products} />
    </article>
  );
}
