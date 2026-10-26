import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ReelsFeed";
import { SignInPanel } from "@/components/SignInPanel";
import { useAuth } from "@/hooks/useAuth";
import { timeAgo } from "@/lib/social";
import { getDmPrivacy, listConversations, setDmPrivacy } from "@/lib/social.functions";

export const Route = createFileRoute("/social/inbox/")({
  head: () => ({
    meta: [
      { title: "Messages — ZANKYO Social" },
      { name: "description", content: "Chat with people on ZANKYO Social." },
      { property: "og:title", content: "Messages — ZANKYO Social" },
      { property: "og:description", content: "Your ZANKYO Social chats." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Inbox,
});

function Inbox() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const chats = useQuery({ queryKey: ["chats", user?.id], enabled: !!user, queryFn: () => listConversations() });
  const privacy = useQuery({ queryKey: ["dm-privacy", user?.id], enabled: !!user, queryFn: () => getDmPrivacy() });
  if (loading) return null;
  if (!user) return <div className="mx-auto max-w-md p-6"><SignInPanel /></div>;

  return (
    <div className="mx-auto max-w-xl px-3 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="zk-display text-3xl">Messages</h1>
        <Link to="/search" className="zk-label min-h-9 border border-border px-3 py-2 text-[10px]">New chat</Link>
      </div>
      <label className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={!!privacy.data?.followersOnly} onChange={async (e) => { await setDmPrivacy({ data: { followersOnly: e.target.checked } }); qc.invalidateQueries({ queryKey: ["dm-privacy"] }); }} />
        Only people I follow can message me
      </label>
      {chats.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {chats.data?.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          <MessageCircle className="mx-auto mb-3 h-8 w-8" />No chats yet. Open someone's profile and tap Message.
        </div>
      )}
      {chats.data?.map((c) => (
        <Link key={c.id} to="/social/inbox/$id" params={{ id: c.id }} className="flex items-center gap-3 py-2.5 active:opacity-70">
          <Avatar url={c.other.avatarUrl} label={c.other.username ?? c.other.name} size="h-12 w-12" />
          <div className="min-w-0 flex-1">
            <p className={`truncate text-sm ${c.unread ? "font-bold" : "font-semibold"}`}>{c.other.username ?? c.other.name}</p>
            <p className={`truncate text-sm ${c.unread ? "text-foreground" : "text-muted-foreground"}`}>{c.preview} · {timeAgo(c.at)}</p>
          </div>
          {c.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">{c.unread}</span>}
        </Link>
      ))}
    </div>
  );
}
