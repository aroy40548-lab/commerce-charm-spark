import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Clapperboard, Eye, Grid3x3, Layers, Loader2, Tag } from "lucide-react";
import { formatMoney } from "@/lib/catalog";
import { profileGrid } from "@/lib/social.functions";

type Tab = "posts" | "reels" | "tagged" | "saved";

export function ProfileGrid({ userId, isMe }: { userId: string; isMe: boolean }) {
  const [tab, setTab] = useState<Tab>("posts");
  const q = useQuery({ queryKey: ["grid", userId, tab], queryFn: () => profileGrid({ data: { userId, tab } }), staleTime: 60_000 });
  const tabs: Array<[Tab, typeof Grid3x3, string]> = [["posts", Grid3x3, "Posts"], ["reels", Clapperboard, "Reels"], ["tagged", Tag, "Products"], ...(isMe ? [["saved", Bookmark, "Saved"] as [Tab, typeof Grid3x3, string]] : [])];

  return (
    <div className="mt-6">
      <div className="flex border-t border-border">
        {tabs.map(([k, Icon, label]) => (
          <button key={k} onClick={() => setTab(k)} aria-label={label} aria-pressed={tab === k} className={`flex min-h-11 flex-1 items-center justify-center gap-2 border-t-2 text-[11px] font-semibold uppercase tracking-widest ${tab === k ? "border-foreground" : "border-transparent text-muted-foreground"}`}>
            <Icon className="h-4 w-4" /><span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
      {q.isLoading && <Loader2 className="mx-auto mt-6 h-5 w-5 animate-spin text-muted-foreground" />}
      {tab === "tagged" ? (
        <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-3">
          {q.data?.products.map((p) => (
            <Link key={p.id} to="/product/$handle" params={{ handle: p.handle }} className="block">
              <div className="aspect-square overflow-hidden bg-muted">{p.image && <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover" />}</div>
              <p className="truncate px-1 pt-1 text-xs font-semibold">{p.title}</p>
              <p className="px-1 text-xs text-muted-foreground">{formatMoney(p.price)}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-1 grid grid-cols-3 gap-1">
          {q.data?.tiles.map((t) => t.kind === "post" ? (
            <Link key={`p${t.id}`} to="/p/$id" params={{ id: t.id }} className="relative aspect-square overflow-hidden bg-muted">
              {t.thumb && <img src={t.thumb} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
              {(t.count ?? 0) > 1 && <Layers className="absolute right-1.5 top-1.5 h-4 w-4 text-white drop-shadow" />}
            </Link>
          ) : (
            <Link key={`r${t.id}`} to="/reels/$id" params={{ id: t.id }} className={`relative overflow-hidden bg-ink ${tab === "reels" ? "aspect-[9/16]" : "aspect-square"}`}>
              <LazyVideo src={t.videoUrl} />
              <span className="absolute bottom-1 left-1 flex items-center gap-1 text-[11px] font-semibold text-white drop-shadow"><Eye className="h-3 w-3" /> {t.views}</span>
            </Link>
          ))}
        </div>
      )}
      {!q.isLoading && (tab === "tagged" ? !q.data?.products.length : !q.data?.tiles.length) && (
        <p className="py-10 text-center text-sm text-muted-foreground">{tab === "saved" ? "Save posts with the bookmark icon." : tab === "tagged" ? "No products tagged yet." : `No ${tab} yet.`}</p>
      )}
    </div>
  );
}

/** Grid video: only fetches its first frame once it scrolls near the screen. */
function LazyVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setOn(true); io.disconnect(); } }, { rootMargin: "300px 0px" });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <video ref={ref} src={on ? `${src}#t=0.1` : undefined} muted playsInline preload="metadata" className="pointer-events-none h-full w-full object-cover" />;
}
