import { useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, PlusSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PostCardView, ReelTileView } from "@/components/social/PostCard";
import { listSocialFeed } from "@/lib/social.functions";

export const Route = createFileRoute("/social/")({
  head: () => ({
    meta: [
      { title: "ZANKYO Social — Fits, reels and the community" },
      { name: "description", content: "See photos and reels from the ZANKYO community, follow creators and shop their fits." },
      { property: "og:title", content: "ZANKYO Social" },
      { property: "og:description", content: "Photos and reels from the ZANKYO streetwear community." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Feed,
});

function Feed() {
  const { user } = useAuth();
  const feed = useInfiniteQuery({
    queryKey: ["social-feed", user?.id ?? null],
    queryFn: ({ pageParam }) => listSocialFeed({ data: { seen: pageParam } }),
    initialPageParam: [] as string[],
    getNextPageParam: (last, pages) => (last.more ? pages.flatMap((p) => p.items.map((i) => i.key)).slice(-600) : undefined),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = end.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting && feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage(); }, { rootMargin: "800px 0px" });
    io.observe(el); return () => io.disconnect();
  }, [feed.hasNextPage, feed.isFetchingNextPage, feed]);

  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <div className="mx-auto w-full max-w-xl pb-6">
      {feed.isLoading && <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
      {feed.isError && <p className="p-6 text-center text-sm text-muted-foreground">Couldn't load the feed. Try again.</p>}
      {!feed.isLoading && !items.length && !feed.isError && (
        <div className="p-10 text-center">
          <p className="zk-display text-3xl">Nothing here yet</p>
          <p className="mt-2 text-sm text-muted-foreground">Post the first fit on ZANKYO Social.</p>
          <Link to="/social/new" className="zk-label mt-5 inline-flex min-h-11 items-center gap-2 bg-foreground px-6 text-xs text-background"><PlusSquare className="h-4 w-4" /> Create a post</Link>
        </div>
      )}
      {items.map((it, i) => it.type === "post" ? <PostCardView key={it.key} post={it.post} eager={i === 0} /> : <ReelTileView key={it.key} reel={it.reel} />)}
      <div ref={end} />
      {feed.isFetchingNextPage && <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-muted-foreground" />}
      {!feed.hasNextPage && items.length > 0 && <p className="py-8 text-center text-xs text-muted-foreground">You're all caught up.</p>}
    </div>
  );
}
