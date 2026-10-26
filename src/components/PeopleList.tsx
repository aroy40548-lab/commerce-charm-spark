import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Avatar } from "@/components/ReelsFeed";
import { useAuth } from "@/hooks/useAuth";
import { setFollow } from "@/lib/profile.functions";

export interface Person { id: string; name: string; username: string; avatarUrl: string | null; following: boolean }

export function PeopleList({ people, onPick, empty }: { people: Person[]; onPick?: () => void; empty: string }) {
  if (!people.length) return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y divide-border">
      {people.map((p) => <PersonRow key={p.id} p={p} onPick={onPick} />)}
    </ul>
  );
}

function PersonRow({ p, onPick }: { p: Person; onPick?: (() => void) | undefined }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [following, setFollowing] = useState(p.following);
  const toggle = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    const next = !following;
    setFollowing(next);
    try { await setFollow({ data: { userId: p.id, follow: next } }); }
    catch (e) { setFollowing(!next); toast.error(e instanceof Error ? e.message : "Couldn't update follow"); }
  };
  return (
    <li className="flex items-center gap-3 py-3">
      <Link to="/u/$username" params={{ username: p.username }} onClick={onPick} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar url={p.avatarUrl} label={p.username} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{p.name}</span>
          <span className="block truncate text-xs text-muted-foreground">@{p.username}</span>
        </span>
      </Link>
      {user?.id !== p.id && (
        <button onClick={toggle} className={`zk-label min-h-9 shrink-0 px-4 text-[10px] ${following ? "border border-foreground" : "bg-foreground text-background"}`}>
          {following ? "Following" : "Follow"}
        </button>
      )}
    </li>
  );
}
