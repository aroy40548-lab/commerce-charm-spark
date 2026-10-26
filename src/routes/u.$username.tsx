import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, Pencil, Share2 } from "lucide-react";
import { ProfileGrid } from "@/components/social/ProfileGrid";
import { openConversation, profileCounts } from "@/lib/social.functions";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/ReelsFeed";
import { ProfileForm } from "@/components/ProfileEditor";
import { useAuth } from "@/hooks/useAuth";
import { getPublicProfile, listFollows, setFollow } from "@/lib/profile.functions";
import { PeopleList } from "@/components/PeopleList";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — ZANKYO Social` },
      { name: "description", content: `Watch @${params.username}'s ZANKYO streetwear reels and shop their fits.` },
      { property: "og:title", content: `@${params.username} on ZANKYO` },
      { property: "og:description", content: `ZANKYO reels by @${params.username}.` },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [list, setList] = useState<"followers" | "following" | null>(null);
  const people = useQuery({ queryKey: ["follows", username, list], enabled: !!list, queryFn: () => listFollows({ data: { username, kind: list! } }) });
  const q = useQuery({ queryKey: ["profile", username, user?.id ?? null], queryFn: () => getPublicProfile({ data: { username } }) });

  const counts = useQuery({ queryKey: ["profile-counts", q.data?.id], enabled: !!q.data?.id, queryFn: () => profileCounts({ data: { userId: q.data!.id } }) });
  if (q.isLoading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  const p = q.data;
  if (!p) return <div className="grid min-h-[60vh] place-items-center p-6 text-center"><div><p className="zk-display text-4xl">Not found</p><p className="mt-2 text-sm text-muted-foreground">No one has the username @{username}.</p></div></div>;

  const shareProfile = async () => {
    const url = `${window.location.origin}/u/${p.username}`;
    try { if (navigator.share) { await navigator.share({ title: `@${p.username} on ZANKYO`, url }); return; } await navigator.clipboard.writeText(url); toast.success("Profile link copied"); } catch { /* cancelled */ }
  };
  const message = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    try { const c = await openConversation({ data: { userId: p.id } }); navigate({ to: "/social/inbox/$id", params: { id: c.id } }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't open chat"); }
  };
  const follow = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    try {
      await setFollow({ data: { userId: p.id, follow: !p.isFollowing } });
      qc.invalidateQueries({ queryKey: ["profile", username] });
      qc.invalidateQueries({ queryKey: ["reels"] });
    } catch { toast.error("Couldn't update follow"); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-5">
        <Avatar url={p.avatarUrl} label={p.username} size="h-20 w-20 sm:h-24 sm:w-24 text-2xl" />
        <div className="min-w-0 flex-1">
          <h1 className="zk-display truncate text-3xl sm:text-4xl">{p.name}</h1>
          <p className="text-sm text-muted-foreground">@{p.username}</p>
          <div className="mt-2 flex gap-5 text-sm">
            <span><b>{(counts.data?.posts ?? 0) + p.reels.length}</b> posts</span>
            <button onClick={() => setList("followers")} className="underline-offset-4 hover:underline"><b>{p.followers}</b> followers</button>
            <button onClick={() => setList("following")} className="underline-offset-4 hover:underline"><b>{p.following}</b> following</button>
          </div>
        </div>
      </div>
      {p.bio && <p className="mt-4 whitespace-pre-line text-sm">{p.bio}</p>}
      <div className="mt-5 flex gap-2">
        {p.isMe ? (
          <>
            <button onClick={() => setEditing(true)} className="zk-label rounded-lg inline-flex min-h-10 flex-1 items-center justify-center gap-2 border border-foreground text-xs sm:flex-none sm:px-8"><Pencil className="h-4 w-4" /> Edit profile</button>
            <button onClick={shareProfile} className="zk-label rounded-lg inline-flex min-h-10 flex-1 items-center justify-center gap-2 border border-border text-xs sm:flex-none sm:px-8"><Share2 className="h-4 w-4" /> Share profile</button>
          </>
        ) : (
          <>
            <button onClick={follow} className={`zk-label rounded-lg min-h-10 flex-1 text-xs sm:flex-none sm:px-10 ${p.isFollowing ? "border border-foreground" : "bg-foreground text-background"}`}>
              {p.isFollowing ? "Following" : "Follow"}
            </button>
            <button onClick={message} className="zk-label rounded-lg inline-flex min-h-10 flex-1 items-center justify-center gap-2 border border-border text-xs sm:flex-none sm:px-10"><MessageCircle className="h-4 w-4" /> Message</button>
            <button onClick={shareProfile} aria-label="Share profile" className="grid min-h-10 w-11 place-items-center rounded-lg border border-border"><Share2 className="h-4 w-4" /></button>
          </>
        )}
      </div>
      <ProfileGrid userId={p.id} isMe={p.isMe} />
      <Dialog open={!!list} onOpenChange={(o) => !o && setList(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <DialogTitle className="zk-display text-3xl">{list === "followers" ? "Followers" : "Following"}</DialogTitle>
          <DialogDescription className="sr-only">People connected to @{p.username}</DialogDescription>
          {people.isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : <PeopleList people={people.data ?? []} onPick={() => setList(null)} empty="No one here yet." />}
        </DialogContent>
      </Dialog>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogTitle className="zk-display text-3xl">Edit profile</DialogTitle>
          <DialogDescription className="sr-only">Change your photo, name, username and bio</DialogDescription>
          <ProfileForm onCancel={() => setEditing(false)} onSaved={(u) => { setEditing(false); if (u !== username) navigate({ to: "/u/$username", params: { username: u } }); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
