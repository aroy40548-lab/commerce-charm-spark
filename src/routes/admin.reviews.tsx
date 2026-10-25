import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, Star, Trash2 } from "lucide-react";
import { adminListReviews, adminModerateReview } from "@/lib/admin/marketing.functions";
import { Empty, PageHeader, ReadOnlyNote, Spinner, Tabs, btnGhost, dateOnly, inputCls, useAction, useCanEdit } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/reviews")({ component: Reviews });

type Filter = "all" | "visible" | "hidden" | "low" | "photos" | "unanswered";

function Reviews() {
  const [filter, setFilter] = useState<Filter>("all");
  const q = useQuery({ queryKey: ["admin-reviews", filter], queryFn: () => adminListReviews({ data: { filter } }) });
  const canEdit = useCanEdit("reviews");
  const { busy, run } = useAction();
  const [reply, setReply] = useState<Record<string, string>>({});
  const inv = ["admin-reviews", "reviews"];

  return (
    <div>
      <PageHeader title="Reviews" subtitle="Only customers with a real order can review. Hidden reviews don't show on the store." />
      <ReadOnlyNote section="reviews" />
      <Tabs value={filter} onChange={setFilter} options={[["all", "All"], ["unanswered", "No reply yet"], ["low", "1–2 stars"], ["photos", "With photos"], ["hidden", "Hidden"]]} />
      {q.isLoading ? <Spinner /> : !q.data?.length ? <Empty>No reviews here.</Empty> : (
        <ul className="space-y-3">
          {q.data.map((r) => (
            <li key={r.id} className={`rounded-xl border border-border bg-background p-4 text-sm ${r.hidden ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-3.5 w-3.5 ${i <= r.rating ? "fill-foreground" : "text-muted-foreground/40"}`} />)}</span>
                <b>{r.customer_name}</b>
                <span className="text-muted-foreground">on <a href={`/product/${r.product_handle}#reviews`} target="_blank" rel="noreferrer" className="underline">{r.product}</a> · {dateOnly(r.created_at)}</span>
                {r.hidden && <span className="rounded bg-muted px-1.5 text-[11px]">Hidden</span>}
                {canEdit && (
                  <span className="ml-auto flex gap-1">
                    <button disabled={!!busy} onClick={() => void run("h", () => adminModerateReview({ data: { action: "hide", id: r.id, hidden: !r.hidden } }), r.hidden ? "Review visible" : "Review hidden", inv)} className={btnGhost} aria-label={r.hidden ? "Show" : "Hide"}>{r.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                    <button disabled={!!busy} onClick={() => { if (confirm("Delete this review and its photos?")) void run("d", () => adminModerateReview({ data: { action: "delete", id: r.id } }), "Review deleted", inv); }} className={btnGhost} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </span>
                )}
              </div>
              {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
              <p className="mt-1 whitespace-pre-line text-muted-foreground">{r.body}</p>
              {r.pictures.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.pictures.map((src) => <a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt="Customer photo" className="h-20 w-20 rounded-md object-cover" /></a>)}
                </div>
              )}
              {canEdit ? (
                <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void run("r" + r.id, () => adminModerateReview({ data: { action: "reply", id: r.id, reply: reply[r.id] ?? r.admin_reply ?? "" } }), "Reply saved", inv); }}>
                  <input value={reply[r.id] ?? r.admin_reply ?? ""} onChange={(e) => setReply({ ...reply, [r.id]: e.target.value })} placeholder="Reply publicly as ZANKYO…" className={inputCls} />
                  <button disabled={!!busy} className={btnGhost}>Save</button>
                </form>
              ) : r.admin_reply && <p className="mt-2 rounded-md bg-muted px-3 py-2 text-xs">Reply: {r.admin_reply}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
