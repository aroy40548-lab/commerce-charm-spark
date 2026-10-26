import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ReelsFeed";
import { PostCardView } from "@/components/social/PostCard";
import { useAuth } from "@/hooks/useAuth";
import { timeAgo } from "@/lib/social";
import { addPostComment, deleteMyPost, deletePostComment, getPost, listPostComments } from "@/lib/social.functions";

export const Route = createFileRoute("/p/$id")({
  head: () => ({
    meta: [
      { title: "Post — ZANKYO Social" },
      { name: "description", content: "A ZANKYO fit shared by the community. Shop the look." },
      { property: "og:title", content: "A fit on ZANKYO Social" },
      { property: "og:description", content: "See this ZANKYO fit and shop the look." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PostPage,
});

function PostPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const post = useQuery({ queryKey: ["post", id, user?.id ?? null], queryFn: () => getPost({ data: { id } }) });
  const comments = useQuery({ queryKey: ["post-comments", id], queryFn: () => listPostComments({ data: { id } }) });

  if (post.isLoading) return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!post.data) return <p className="p-10 text-center text-sm text-muted-foreground">This post isn't available.</p>;
  const p = post.data;
  const mine = user?.id === p.creatorId;

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { await addPostComment({ data: { id, body: text } }); setText(""); await qc.invalidateQueries({ queryKey: ["post-comments", id] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't post"); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-xl pb-6">
      <PostCardView post={p} eager />
      {mine && (
        <button onClick={async () => { if (!confirm("Delete this post?")) return; await deleteMyPost({ data: { id } }); qc.invalidateQueries({ queryKey: ["grid"] }); navigate({ to: "/social" }); }} className="zk-label mx-3 mt-3 inline-flex min-h-9 items-center gap-2 border border-border px-3 text-[10px] text-destructive">
          <Trash2 className="h-3.5 w-3.5" /> Delete post
        </button>
      )}
      <section className="space-y-4 px-3 pt-4">
        <h2 className="zk-label text-xs text-muted-foreground">Comments</h2>
        {comments.data?.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
        {comments.data?.map((c) => (
          <div key={c.id} className="flex gap-3">
            <Avatar url={c.avatarUrl} label={c.name} />
            <div className="min-w-0 flex-1">
              <p className="text-xs"><b>{c.name}</b> <span className="text-muted-foreground">· {timeAgo(c.createdAt)}</span></p>
              <p className="break-words text-sm">{c.body}</p>
            </div>
            {(user?.id === c.userId || mine) && (
              <button onClick={async () => { await deletePostComment({ data: { id: c.id } }); qc.invalidateQueries({ queryKey: ["post-comments", id] }); }} aria-label="Delete comment" className="grid h-9 w-9 place-items-center text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
            )}
          </div>
        ))}
        {user ? (
          <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Add a comment" aria-label="Add a comment" className="min-h-11 min-w-0 flex-1 border border-border bg-background px-3 text-base sm:text-sm" />
            <button disabled={busy || !text.trim()} aria-label="Post comment" className="grid h-11 w-11 place-items-center bg-foreground text-background disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
          </form>
        ) : (
          <Link to="/auth" className="zk-label flex min-h-11 items-center justify-center bg-foreground text-xs text-background">Sign in to comment</Link>
        )}
      </section>
    </div>
  );
}
