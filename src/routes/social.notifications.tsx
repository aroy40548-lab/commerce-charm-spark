import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Loader2, Megaphone } from "lucide-react";
import { Avatar } from "@/components/ReelsFeed";
import { SignInPanel } from "@/components/SignInPanel";
import { useAuth } from "@/hooks/useAuth";
import { notificationText, timeAgo, timeGroup } from "@/lib/social";
import { listNotifications, markNotificationsRead } from "@/lib/social.functions";

export const Route = createFileRoute("/social/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — ZANKYO Social" },
      { name: "description", content: "Likes, comments and new followers on ZANKYO Social." },
      { property: "og:title", content: "Notifications — ZANKYO Social" },
      { property: "og:description", content: "Your ZANKYO Social activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Notifications,
});

function Notifications() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const q = useInfiniteQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: ({ pageParam }) => listNotifications({ data: { before: pageParam } }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.more ? last.items[last.items.length - 1]?.createdAt ?? null : undefined),
  });
  const firstPage = q.data?.pages[0];
  useEffect(() => {
    if (firstPage?.items.some((i) => !i.read)) void markNotificationsRead().then(() => qc.invalidateQueries({ queryKey: ["social-badges"] }));
  }, [firstPage, qc]);

  if (loading) return null;
  if (!user) return <div className="mx-auto max-w-md p-6"><SignInPanel /></div>;
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  let lastGroup = "";

  return (
    <div className="mx-auto max-w-xl px-3 py-4">
      <h1 className="zk-display mb-3 text-3xl">Notifications</h1>
      {q.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {!q.isLoading && !items.length && <div className="py-16 text-center text-sm text-muted-foreground"><Bell className="mx-auto mb-3 h-8 w-8" />Likes, comments and follows will show up here.</div>}
      {items.map((n) => {
        const g = timeGroup(n.createdAt);
        const header = g !== lastGroup ? (lastGroup = g) : null;
        const text = notificationText(n.kind, !!n.reelId, n.body);
        const row = (
          <div className={`flex items-center gap-3 py-2.5 ${n.read ? "" : "bg-accent/5"}`}>
            {n.actor ? <Avatar url={n.actor.avatarUrl} label={n.actor.username ?? n.actor.name} size="h-10 w-10" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"><Megaphone className="h-4 w-4" /></span>}
            <p className="min-w-0 flex-1 text-sm">
              {n.actor && <b>{n.actor.username ?? n.actor.name} </b>}
              <span className="break-words">{text}</span>{" "}
              <span className="text-muted-foreground">{timeAgo(n.createdAt)}</span>
            </p>
          </div>
        );
        return (
          <div key={n.id}>
            {header && <h2 className="zk-label mt-4 mb-1 text-[11px] text-muted-foreground">{header}</h2>}
            {n.postId ? <Link to="/p/$id" params={{ id: n.postId }}>{row}</Link>
              : n.reelId ? <Link to="/reels/$id" params={{ id: n.reelId }}>{row}</Link>
              : n.kind === "follow" && n.actor?.username ? <Link to="/u/$username" params={{ username: n.actor.username }}>{row}</Link>
              : n.kind === "partner" ? <Link to="/affiliate">{row}</Link>
              : row}
          </div>
        );
      })}
      {q.hasNextPage && <button onClick={() => q.fetchNextPage()} className="zk-label mt-4 min-h-11 w-full border border-border text-xs">{q.isFetchingNextPage ? "Loading…" : "Load more"}</button>}
    </div>
  );
}
