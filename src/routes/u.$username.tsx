import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/ReelsFeed";
import { ProfileForm } from "@/components/ProfileEditor";
import { useAuth } from "@/hooks/useAuth";
import { getPublicProfile, setFollow } from "@/lib/profile.functions";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — ZANKYO Reels` },
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
  const q = useQuery({ queryKey: ["profile", username, user?.id ?? null], queryFn: () => getPublicProfile({ data: { username } }) });

  if (q.isLoading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  const p = q.data;
  if (!p) return <div className="grid min-h-[60vh] place-items-center p-6 text-center"><div><p className="zk-display text-4xl">Not found</p><p className="mt-2 text-sm text-muted-foreground">No one has the username @{username}.</p></div></div>;

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
            <span><b>{p.reels.length}</b> reels</span>
            <span><b>{p.followers}</b> followers</span>
            <span><b>{p.following}</b> following</span>
          </div>
        </div>
      </div>
      {p.bio && <p className="mt-4 whitespace-pre-line text-sm">{p.bio}</p>}
      <div className="mt-5">
        {p.isMe ? (
          <button onClick={() => setEditing(true)} className="zk-label inline-flex min-h-11 w-full items-center justify-center gap-2 border border-foreground text-xs sm:w-auto sm:px-8"><Pencil className="h-4 w-4" /> Edit profile</button>
        ) : (
          <button onClick={follow} className={`zk-label min-h-11 w-full text-xs sm:w-auto sm:px-10 ${p.isFollowing ? "border border-foreground" : "bg-foreground text-background"}`}>
            {p.isFollowing ? "Following" : "Follow"}
          </button>
        )}
      </div>
      <div className="mt-8 grid grid-cols-3 gap-1">
        {p.reels.map((r) => (
          <Link key={r.id} to="/reels/$id" params={{ id: r.id }} className="relative aspect-[9/16] overflow-hidden bg-ink">
            <video src={r.videoUrl} muted playsInline preload="metadata" className="pointer-events-none h-full w-full object-cover" />
            <span className="absolute bottom-1 left-1 flex items-center gap-1 text-[11px] font-semibold text-white drop-shadow"><Eye className="h-3 w-3" /> {r.views}</span>
          </Link>
        ))}
      </div>
      {!p.reels.length && <p className="mt-6 text-center text-sm text-muted-foreground">No reels yet.</p>}
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
