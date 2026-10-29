import { VerifiedTick } from "@/components/social/Verified";
import { memo, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, Clapperboard, Heart, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ReelsFeed";
import { useAuth } from "@/hooks/useAuth";
import { ProductsTray, VideoSpinner } from "@/components/social/ProductsTray";
import { timeAgo } from "@/lib/social";
import { likePost, toggleSave, type PostCard as Post, type ProductChip, type ReelTile } from "@/lib/social.functions";

function needSignIn(what: string) {
  toast(`Sign in to ${what}`, { action: { label: "Sign in", onClick: () => (window.location.href = "/auth") } });
}

export function CreatorRow({ username, name, avatarUrl, at, verified = false }: { username: string | null; name: string; avatarUrl: string | null; at: string; verified?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {username ? (
        <Link to="/u/$username" params={{ username }} className="flex min-w-0 items-center gap-2">
          <span className={verified ? "zk-verified-ring !p-[2px]" : "rounded-full bg-gradient-to-tr from-accent to-primary p-[2px]"}><span className="block rounded-full bg-background p-[2px]"><Avatar url={avatarUrl} label={username} /></span></span>
          <span className="truncate text-sm font-semibold">{username}</span>{verified && <VerifiedTick className="h-3.5 w-3.5" />}
        </Link>
      ) : (
        <span className="flex items-center gap-2"><Avatar url={avatarUrl} label={name} /><span className="text-sm font-semibold">{name}</span></span>
      )}
      <span className="text-xs text-muted-foreground">· {timeAgo(at)}</span>
    </div>
  );
}

export function ShopChip({ products }: { products: ProductChip[] }) {
  if (!products.length) return null;
  return <div className="mx-3 mt-3"><ProductsTray products={products} /></div>;
}

function FeedVideo({ vid, near, inView, src }: { vid: React.RefObject<HTMLVideoElement | null>; near: boolean; inView: boolean; src: string }) {
  const [loading, setLoading] = useState(true);
  return (
    <>
      <video ref={vid} src={near ? src : undefined} muted autoPlay={inView} loop playsInline preload={near ? "auto" : "none"} onWaiting={() => setLoading(true)} onPlaying={() => setLoading(false)} onLoadedData={(e) => { if (inView) void e.currentTarget.play().catch(() => {}); else setLoading(false); }} className="h-full w-full bg-ink object-cover" />
      <VideoSpinner show={loading && inView} />
    </>
  );
}

export const PostCardView = memo(function PostCardView({ post, eager = false }: { post: Post; eager?: boolean }) {
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
    <article className="zk-feed-card pb-5">
      <CreatorRow username={post.username} name={post.name} avatarUrl={post.avatarUrl} at={post.createdAt} verified={post.verified} />
      <div className="relative bg-muted" style={{ aspectRatio: `1 / ${ratio}` }} onClick={tap}>
        <div
          ref={strip}
          onScroll={(e) => setIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
        >
          {post.media.map((m, i) => (
            <div key={i} className="relative h-full w-full shrink-0 snap-center">
              {m.thumb && <img src={m.thumb} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl" />}
              <img src={m.url} alt="" loading={eager && i === 0 ? "eager" : "lazy"} decoding="async" width={m.w || undefined} height={m.h || undefined} className="relative h-full w-full object-cover opacity-0 transition-opacity duration-300" onLoad={(e) => e.currentTarget.classList.remove("opacity-0")} />
            </div>
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
        <button onClick={() => like(!liked)} aria-label="Like" aria-pressed={liked} className="grid h-11 w-11 place-items-center"><Heart key={liked ? "on" : "off"} className={`h-7 w-7 ${liked ? "zk-pop fill-accent text-accent" : ""}`} /></button>
        <Link to="/p/$id" params={{ id: post.id }} aria-label="Comments" className="grid h-11 w-11 place-items-center"><MessageCircle className="h-7 w-7" /></Link>
        <button onClick={share} aria-label="Share" className="grid h-11 w-11 place-items-center"><Send className="h-7 w-7" /></button>
        <button onClick={save} aria-label="Save" aria-pressed={saved} className="ml-auto grid h-11 w-11 place-items-center"><Bookmark className={`h-7 w-7 ${saved ? "zk-pop fill-foreground" : ""}`} /></button>
      </div>
      <p className="px-3 text-sm font-semibold">{likes} {likes === 1 ? "like" : "likes"}</p>
      {post.caption && <Caption who={post.username ?? post.name} text={post.caption} />}
      {post.comments > 0 && <Link to="/p/$id" params={{ id: post.id }} className="block px-3 pt-1 text-sm text-muted-foreground">View all {post.comments} comments</Link>}
      <ShopChip products={post.products} />
    </article>
  );
});

/** Reel inside the photo feed: plays silently when on screen, tap to open full screen. */
export const ReelTileView = memo(function ReelTileView({ reel }: { reel: ReelTile }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(reel.saved);
  const save = async () => {
    if (!user) return needSignIn("save reels");
    const next = !saved; setSaved(next);
    try { await toggleSave({ data: { kind: "reel", id: reel.id, save: next } }); } catch { setSaved(!next); toast.error("Couldn't save"); }
  };
  const box = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) setNear(true);
      setInView(!!e?.isIntersecting && e.intersectionRatio >= 0.5);
    }, { threshold: [0, 0.5, 0.8] });
    io.observe(el); return () => io.disconnect();
  }, []);
  useEffect(() => {
    const v = vid.current; if (!v || !near) return;
    if (inView) { v.muted = true; void v.play().catch(() => {}); } else v.pause();
  }, [inView, near]);
  return (
    <article ref={box} className="border-b border-border pb-3">
      <CreatorRow username={reel.username} name={reel.name} avatarUrl={reel.avatarUrl} at={reel.createdAt} verified={reel.verified} />
      <Link to="/reels/$id" params={{ id: reel.id }} className="relative block aspect-[4/5] overflow-hidden bg-ink">
        <FeedVideo vid={vid} near={near} inView={inView} src={reel.videoUrl} />
        <span className="zk-label absolute right-2 top-2 flex items-center gap-1 bg-ink/70 px-2 py-1 text-[9px] text-white"><Clapperboard className="h-3 w-3" /> Reel</span>
      </Link>
      <div className="flex items-center px-3 pt-2">
        <p className="text-sm font-semibold">{reel.likes} likes · {reel.views} views</p>
        <button onClick={save} aria-label="Save reel" aria-pressed={saved} className="ml-auto grid h-11 w-11 place-items-center"><Bookmark className={`h-7 w-7 ${saved ? "zk-pop fill-foreground" : ""}`} /></button>
      </div>
      {reel.caption && <Caption who={reel.username ?? reel.name} text={reel.caption} />}
      <ShopChip products={reel.products} />
    </article>
  );
});

function Caption({ who, text }: { who: string; text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 110 || text.includes("\n");
  return (
    <p className="whitespace-pre-line px-3 pt-0.5 text-sm leading-5">
      <b>{who}</b> {open || !long ? text : `${text.slice(0, 110).split("\n")[0]}…`}
      {long && !open && <button onClick={() => setOpen(true)} className="ml-1 text-muted-foreground">more</button>}
    </p>
  );
}
