import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminListReels, adminModerateReel, adminSetPriority } from "@/lib/reels.functions";
import { PRIORITIES } from "@/lib/reels";

export const Route = createFileRoute("/admin/reels")({
  head: () => ({ meta: [{ title: "Reels — ZANKYO Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminReels,
});

function AdminReels() {
  const qc = useQueryClient();
  const reels = useQuery({ queryKey: ["admin-reels"], queryFn: () => adminListReels() });
  const act = async (action: "hide" | "show" | "delete" | "hideComment" | "showComment" | "deleteComment", id: string) => {
    if (action.startsWith("delete") && !confirm("Delete permanently?")) return;
    try {
      await adminModerateReel({ data: { action, id } });
      qc.invalidateQueries({ queryKey: ["admin-reels"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const prio = async (kind: "reel" | "creator", id: string, value: number) => {
    try {
      await adminSetPriority({ data: { kind, id, value: value as 0 | 1 | 2 | 4 } });
      qc.invalidateQueries({ queryKey: ["admin-reels"] });
      toast.success("Feed push updated");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const sel = "rounded border border-border bg-background px-2 py-1.5 text-xs";

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <h1 className="text-2xl font-bold">Reels</h1>
      <p className="text-sm text-muted-foreground">Customer reels and comments. Hide anything that breaks the rules. "Push" makes a reel or creator show up more often in the shuffled feed (Boost = 2×, Top = 4×).</p>
      {reels.isLoading && <Loader2 className="mt-6 h-5 w-5 animate-spin" />}
      {reels.data?.length === 0 && <p className="mt-6 text-sm text-muted-foreground">No reels yet.</p>}
      <div className="mt-6 space-y-4">
        {reels.data?.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-background p-4">
            <div className="flex gap-4">
              <video src={r.videoUrl} controls muted playsInline preload="metadata" className="aspect-[9/16] w-32 shrink-0 rounded bg-black object-cover" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold">{r.creator} <Link to="/admin/customers/$id" params={{ id: r.creatorId }} className="ml-1 text-xs font-normal underline">Account access</Link> {r.status === "hidden" && <span className="ml-2 rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive">Hidden</span>}</p>
                <p className="mt-1">{r.caption}</p>
                <p className="mt-1 text-xs text-muted-foreground">{r.views} views · {r.likes} likes · {r.dislikes} dislikes · {new Date(r.createdAt).toLocaleString("en-IN")}</p>
                <p className="mt-1 text-xs text-muted-foreground">Products: {r.products.map((p) => p.title).join(", ") || "none"}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                  <label className="flex items-center gap-1">Reel push
                    <select value={r.priority} onChange={(e) => prio("reel", r.id, Number(e.target.value))} className={sel}>
                      {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center gap-1">Creator push (all their reels)
                    <select value={r.creatorPriority} onChange={(e) => prio("creator", r.creatorId, Number(e.target.value))} className={sel}>
                      {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </label>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => act(r.status === "hidden" ? "show" : "hide", r.id)} className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-xs">
                    {r.status === "hidden" ? <><Eye className="h-3 w-3" /> Show</> : <><EyeOff className="h-3 w-3" /> Hide</>}
                  </button>
                  <button onClick={() => act("delete", r.id)} className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-xs text-destructive"><Trash2 className="h-3 w-3" /> Delete</button>
                </div>
              </div>
            </div>
            {r.commentList.length > 0 && (
              <ul className="mt-3 divide-y divide-border border-t border-border text-sm">
                {r.commentList.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 py-2">
                    <span className={`min-w-0 flex-1 ${c.hidden ? "text-muted-foreground line-through" : ""}`}><b>{c.name}:</b> {c.body}</span>
                    <button onClick={() => act(c.hidden ? "showComment" : "hideComment", c.id)} className="text-xs underline">{c.hidden ? "Show" : "Hide"}</button>
                    <button onClick={() => act("deleteComment", c.id)} aria-label="Delete comment" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
