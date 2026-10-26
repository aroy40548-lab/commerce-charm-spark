import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, RefreshCw, Search, MessageCircle, Plus, Share2, ThumbsDown, ThumbsUp, Volume2, VolumeX, Loader2, Trash2, Send, Clapperboard } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney } from "@/lib/catalog";
import { reelLink } from "@/lib/reels";
import { setFollow } from "@/lib/profile.functions";
import { toggleSave } from "@/lib/social.functions";
import {
  addReelComment, deleteReelComment, getMyVotes, listReelComments, listReels, viewReel, voteReel, type ReelCard,
} from "@/lib/reels.functions";

export function ReelsFeed({ startId }: { startId?: string | undefined }) {
  const { user } = useAuth();
  const [muted, setMuted] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const toggleMute = () => {
    if (soundBlocked) { setSoundBlocked(false); setMuted(false); return; }
    setMuted((m) => !m);
  };
  const onBlocked = () => { setMuted(true); setSoundBlocked(true); };
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const feed = useInfiniteQuery({
    queryKey: ["reels", startId ?? null, user?.id ?? null],
    queryFn: ({ pageParam }) => listReels({ data: { seen: pageParam, startId: startId ?? null } }),
    initialPageParam: [] as string[],
    getNextPageParam: (last, pages) => (last.more ? pages.flatMap((p) => p.reels.map((r) => r.id)).slice(-400) : undefined),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const scroller = useRef<HTMLDivElement>(null);
  const pull = useRef<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    scroller.current?.scrollTo({ top: 0 });
    try { await feed.refetch(); } finally { setRefreshing(false); }
  };
  const reels = feed.data?.pages.flatMap((p) => p.reels) ?? [];
  const ids = reels.map((r) => r.id);
  const votes = useQuery({
    queryKey: ["reel-votes", user?.id, ids.join(",")],
    enabled: !!user && ids.length > 0,
    queryFn: () => getMyVotes({ data: { ids } }),
  });

  if (feed.isLoading) return <div className="grid h-full place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (feed.isError) return <div className="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground">Couldn't load reels. Pull to refresh.</div>;

  if (!reels.length) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div>
          <Clapperboard className="mx-auto h-10 w-10" />
          <p className="zk-display mt-4 text-3xl">No reels yet</p>
          <p className="mt-2 text-sm text-muted-foreground">Be the first to post a ZANKYO fit.</p>
          <Link to="/reels/studio" className="zk-label mt-5 inline-flex min-h-11 items-center gap-2 bg-foreground px-6 text-xs text-background">
            <Plus className="h-4 w-4" /> Post a reel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={scroller}
        onTouchStart={(e) => { pull.current = scroller.current?.scrollTop === 0 ? e.touches[0]!.clientY : null; }}
        onTouchEnd={(e) => { if (pull.current !== null && e.changedTouches[0]!.clientY - pull.current > 90) void refresh(); pull.current = null; }}
        className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none]"
      >
        {reels.map((r, i) => (
          <ReelItem
            key={r.id}
            reel={r}
            muted={muted}
            onToggleMute={toggleMute}
            onBlocked={onBlocked}
            myVote={votes.data?.[r.id] ?? 0}
            onComments={() => setCommentsFor(r.id)}
            onNear={i >= reels.length - 3 && feed.hasNextPage && !feed.isFetchingNextPage ? () => feed.fetchNextPage() : undefined}
          />
        ))}
      </div>
      <div className="absolute right-16 top-3 z-20 flex gap-2">
        <Link to="/search" aria-label="Find people" className="grid h-11 w-11 place-items-center bg-black/60 text-white"><Search className="h-5 w-5" /></Link>
        <button onClick={() => void refresh()} aria-label="Refresh reels" className="grid h-11 w-11 place-items-center bg-black/60 text-white">
          <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>
      <Link
        to="/reels/studio"
        aria-label="Post a reel"
        className="absolute right-3 top-3 z-20 grid h-11 w-11 place-items-center bg-foreground text-background shadow-lg active:opacity-80"
      >
        <Plus className="h-5 w-5" />
      </Link>
      {soundBlocked && (
        <button onClick={toggleMute} className="zk-label absolute left-1/2 top-3 z-20 flex min-h-9 -translate-x-1/2 items-center gap-2 bg-black/70 px-4 text-[10px] text-white">
          <Volume2 className="h-4 w-4" /> Tap for sound
        </button>
      )}
      <CommentsSheet reelId={commentsFor} onClose={() => setCommentsFor(null)} />
    </>
  );
}

function ReelItem({
  reel, muted, onToggleMute, onBlocked, myVote, onComments, onNear,
}: {
  reel: ReelCard; muted: boolean; onToggleMute: () => void; onBlocked: () => void; myVote: number; onComments: () => void; onNear?: (() => void) | undefined;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const viewed = useRef(false);
  const [vote, setVote] = useState(myVote);
  const [counts, setCounts] = useState({ likes: reel.likes, dislikes: reel.dislikes });
  useEffect(() => setVote(myVote), [myVote]);

  const [near, setNear] = useState(false);
  const [loadingVid, setLoadingVid] = useState(true);
  const [heart, setHeart] = useState(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const nearIo = new IntersectionObserver(([e]) => setNear(!!e?.isIntersecting), { rootMargin: "100% 0px" });
    const io = new IntersectionObserver(
      ([e]) => {
        const v = video.current;
        if (!v) return;
        if (e?.isIntersecting) {
          void v.play().catch(() => {
            if (!v.muted) { v.muted = true; onBlocked(); void v.play().catch(() => {}); }
          });
          if (!viewed.current) { viewed.current = true; void viewReel({ data: { id: reel.id, device: deviceId() } }).catch(() => {}); }
          onNear?.();
        } else v.pause();
      },
      { threshold: 0.6 },
    );
    nearIo.observe(el);
    io.observe(el);
    return () => { io.disconnect(); nearIo.disconnect(); };
  }, [reel.id, onNear]);

  const onTap = () => {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      setHeart((h) => h + 1);
      if (vote !== 1) void doVote(1);
      return;
    }
    tapTimer.current = setTimeout(() => { tapTimer.current = null; onToggleMute(); }, 260);
  };

  const doVote = async (value: 1 | -1) => {
    if (!user) { toast("Sign in to like or dislike reels", { action: { label: "Sign in", onClick: () => (window.location.href = "/auth") } }); return; }
    const next = vote === value ? 0 : value;
    const c = { ...counts };
    if (vote === 1) c.likes--; if (vote === -1) c.dislikes--;
    if (next === 1) c.likes++; if (next === -1) c.dislikes++;
    setVote(next); setCounts(c);
    try {
      await voteReel({ data: { id: reel.id, value: next as 1 | -1 | 0 } });
      qc.invalidateQueries({ queryKey: ["reel-votes"] });
    } catch { setVote(vote); setCounts(counts); toast.error("Couldn't save your vote"); }
  };

  const [saved, setSaved] = useState(reel.saved);
  const toggleSaved = async () => {
    if (!user) { toast("Sign in to save reels", { action: { label: "Sign in", onClick: () => (window.location.href = "/auth") } }); return; }
    const next = !saved; setSaved(next);
    try { await toggleSave({ data: { kind: "reel", id: reel.id, save: next } }); qc.invalidateQueries({ queryKey: ["grid"] }); if (next) toast.success("Saved"); }
    catch { setSaved(!next); toast.error("Couldn't save"); }
  };
  const [following, setFollowing] = useState(reel.following);
  const toggleFollow = async () => {
    if (!user) { toast("Sign in to follow creators", { action: { label: "Sign in", onClick: () => (window.location.href = "/auth") } }); return; }
    const next = !following;
    setFollowing(next);
    try { await setFollow({ data: { userId: reel.creatorId, follow: next } }); }
    catch { setFollowing(!next); toast.error("Couldn't update follow"); }
  };

  const share = async () => {
    const link = reelLink(window.location.origin, reel.id, reel.creatorCode);
    try {
      if (navigator.share) { await navigator.share({ title: `ZANKYO reel by ${reel.creator}`, url: link }); return; }
      await navigator.clipboard.writeText(link);
      toast.success("Reel link copied");
    } catch { /* cancelled */ }
  };

  const action = "flex flex-col items-center gap-1 text-[11px] font-semibold text-white drop-shadow";
  const product = reel.products[0];

  return (
    <div ref={ref} className="relative h-full w-full snap-start snap-always overflow-hidden bg-ink">
      <video
        ref={video}
        src={near ? reel.videoUrl : undefined}
        muted={muted}
        loop
        playsInline
        preload={near ? "auto" : "none"}
        onClick={onTap}
        onWaiting={() => setLoadingVid(true)}
        onPlaying={() => setLoadingVid(false)}
        onCanPlay={() => setLoadingVid(false)}
        className="h-full w-full object-contain"
      />
      {loadingVid && <div className="zk-reel-loading pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-accent" />}
      {heart > 0 && (
        <ThumbsUp key={heart} className="zk-reel-heart pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 fill-accent text-accent" />
      )}
      <button onClick={onToggleMute} aria-label={muted ? "Unmute" : "Mute"} className="absolute left-3 top-3 grid h-9 w-9 place-items-center bg-black/50 text-white">
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

      <div className="absolute bottom-24 right-2 flex flex-col items-center gap-5">
        <button onClick={() => doVote(1)} aria-label="Like" aria-pressed={vote === 1} className={action}>
          <ThumbsUp className={`h-7 w-7 ${vote === 1 ? "fill-accent text-accent" : ""}`} /> {counts.likes}
        </button>
        <button onClick={() => doVote(-1)} aria-label="Dislike" aria-pressed={vote === -1} className={action}>
          <ThumbsDown className={`h-7 w-7 ${vote === -1 ? "fill-white" : ""}`} /> {counts.dislikes}
        </button>
        <button onClick={onComments} aria-label="Comments" className={action}>
          <MessageCircle className="h-7 w-7" /> {reel.comments}
        </button>
        <button onClick={share} aria-label="Share reel" className={action}>
          <Share2 className="h-7 w-7" /> Share
        </button>
        <button onClick={toggleSaved} aria-label="Save reel" aria-pressed={saved} className={action}>
          <Bookmark className={`h-7 w-7 ${saved ? "fill-accent text-accent" : ""}`} /> {saved ? "Saved" : "Save"}
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 space-y-2 p-3 pr-16 text-white">
        <div className="flex items-center gap-2">
          {reel.username ? (
            <Link to="/u/$username" params={{ username: reel.username }} className="flex min-w-0 items-center gap-2">
              <Avatar url={reel.avatarUrl} label={reel.username} />
              <span className="zk-label truncate text-[12px]">@{reel.username}</span>
            </Link>
          ) : (
            <span className="zk-label text-[12px]">{reel.creator}</span>
          )}
          {user?.id !== reel.creatorId && reel.username && (
            <button onClick={toggleFollow} className={`zk-label min-h-8 shrink-0 border px-3 text-[10px] ${following ? "border-white/40 text-white/80" : "border-white bg-white text-black"}`}>
              {following ? "Following" : "Follow"}
            </button>
          )}
        </div>
        {reel.caption && <p className="line-clamp-2 text-sm leading-5 text-white/90">{reel.caption}</p>}
        {product && (
          <Link
            to="/product/$handle"
            params={{ handle: product.handle }}
            className="flex max-w-xs items-center gap-3 border border-white/20 bg-black/60 p-2 backdrop-blur-md active:opacity-80"
          >
            <div className="h-12 w-12 shrink-0 overflow-hidden bg-white/10">
              {product.image && <img src={product.image} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{product.title}</p>
              <p className="text-xs text-white/80">{formatMoney(product.price)}{reel.products.length > 1 ? ` · +${reel.products.length - 1} more` : ""}</p>
            </div>
            <span className="zk-label ml-auto shrink-0 bg-accent px-2 py-1 text-[9px] text-accent-foreground">Shop</span>
          </Link>
        )}
      </div>
    </div>
  );
}

function CommentsSheet({ reelId, onClose }: { reelId: string | null; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useQuery({ queryKey: ["reel-comments", reelId], enabled: !!reelId, queryFn: () => listReelComments({ data: { id: reelId! } }) });

  const post = async () => {
    if (!reelId || !text.trim()) return;
    setBusy(true);
    try {
      await addReelComment({ data: { id: reelId, body: text } });
      setText("");
      await qc.invalidateQueries({ queryKey: ["reel-comments", reelId] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't post"); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    await deleteReelComment({ data: { id } });
    qc.invalidateQueries({ queryKey: ["reel-comments", reelId] });
  };

  return (
    <Sheet open={!!reelId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="flex h-[70dvh] flex-col p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader>
          <SheetTitle className="zk-label text-sm">Comments</SheetTitle>
          <SheetDescription className="sr-only">Comments on this reel</SheetDescription>
        </SheetHeader>
        <div className="mt-3 flex-1 space-y-4 overflow-y-auto">
          {list.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          {list.data?.length === 0 && <p className="text-sm text-muted-foreground">No comments yet. Say something.</p>}
          {list.data?.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center bg-muted text-xs font-bold uppercase">{c.name[0]}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">{c.name} <span className="font-normal text-muted-foreground">· {new Date(c.createdAt).toLocaleDateString("en-IN")}</span></p>
                <p className="break-words text-sm">{c.body}</p>
              </div>
              {user?.id === c.userId && (
                <button onClick={() => remove(c.id)} aria-label="Delete comment" className="grid h-9 w-9 shrink-0 place-items-center text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
          ))}
        </div>
        {user ? (
          <form onSubmit={(e) => { e.preventDefault(); void post(); }} className="mt-3 flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Add a comment" aria-label="Add a comment" className="min-h-11 min-w-0 flex-1 border border-border bg-background px-3 text-base sm:text-sm" />
            <button disabled={busy || !text.trim()} aria-label="Post comment" className="grid h-11 w-11 place-items-center bg-foreground text-background disabled:opacity-40">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        ) : (
          <Link to="/auth" className="zk-label mt-3 flex min-h-11 items-center justify-center bg-foreground text-xs text-background">Sign in to comment</Link>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function Avatar({ url, label, size = "h-8 w-8" }: { url: string | null; label: string; size?: string }) {
  return url ? (
    <img src={url} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <span className={`${size} grid shrink-0 place-items-center rounded-full bg-accent text-xs font-bold uppercase text-accent-foreground`}>{label[0]}</span>
  );
}

function deviceId() {
  try {
    let id = localStorage.getItem("zankyo-device");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("zankyo-device", id); }
    return id;
  } catch { return undefined; }
}
