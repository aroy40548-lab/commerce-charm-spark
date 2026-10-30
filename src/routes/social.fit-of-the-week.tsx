import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, Loader2 } from "lucide-react";
import { PostCardView } from "@/components/social/PostCard";
import { fitOfTheWeek } from "@/lib/social.functions";

export const Route = createFileRoute("/social/fit-of-the-week")({
  head: () => ({
    meta: [
      { title: "Fit of the Week — ZANKYO Social" },
      { name: "description", content: "The most-liked ZANKYO fits of the last 7 days. Post yours and climb the board." },
      { property: "og:title", content: "Fit of the Week — ZANKYO Social" },
      { property: "og:description", content: "Top-voted streetwear fits from the ZANKYO community this week." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FitOfTheWeek,
});

function FitOfTheWeek() {
  const q = useQuery({ queryKey: ["fit-of-the-week"], queryFn: () => fitOfTheWeek(), staleTime: 60_000 });
  const list = q.data ?? [];
  return (
    <div className="mx-auto w-full max-w-xl px-3 py-4 pb-8">
      <p className="zk-label text-[11px] text-accent">Leaderboard · last 7 days</p>
      <h1 className="zk-display mt-1 text-4xl">Fit of the Week</h1>
      <p className="mt-1 text-sm text-muted-foreground">Most-liked fits win. Like your favourites — the #1 fit gets a ZANKYO reward every week.</p>
      {q.isLoading && <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-muted-foreground" />}
      {!q.isLoading && !list.length && (
        <div className="py-14 text-center">
          <p className="text-sm text-muted-foreground">No fits on the board yet this week.</p>
          <Link to="/social/new" className="zk-label mt-4 inline-flex min-h-11 items-center bg-foreground px-6 text-xs text-background">Post your fit</Link>
        </div>
      )}
      {list.map((p, i) => (
        <div key={p.id} className="mt-5">
          <div className="mb-1 flex items-center gap-2 px-1">
            <span className={`zk-display text-2xl ${i === 0 ? "text-accent" : ""}`}>#{i + 1}</span>
            {i === 0 && <Crown className="h-5 w-5 text-accent" />}
            <span className="text-xs text-muted-foreground">{p.likes} likes</span>
          </div>
          <PostCardView post={p} eager={i === 0} />
        </div>
      ))}
    </div>
  );
}
