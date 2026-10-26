import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, Empty, ReadOnlyNote, Spinner, Stat, StatusBadge, useCanEdit } from "@/components/admin/ui";
import {
  adminBroadcast, adminListPosts, adminModeratePosts, adminReportedChat, adminReports, adminResolveReport, adminSocialOverview,
} from "@/lib/social.functions";

const PUSH: Array<[string, string]> = [["p1", "Normal"], ["p2", "Boost"], ["p4", "Top"], ["p0", "Hide from feed"]];

export function SocialOverview() {
  const q = useQuery({ queryKey: ["admin-social-overview"], queryFn: () => adminSocialOverview() });
  if (!q.data) return <Spinner />;
  const d = q.data;
  const max = Math.max(1, ...d.days.map((x) => Math.max(x.posts, x.messages)));
  return (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Photo posts" value={d.posts} sub={`${d.live} live · ${d.postsWeek} this week`} />
        <Stat label="Post likes / comments" value={`${d.likes} / ${d.comments}`} />
        <Stat label="Messages (30 days)" value={d.messages30} sub={`${d.chats} chats`} />
        <Stat label="Active members (7 days)" value={d.activeUsers} sub={d.openReports ? `${d.openReports} open chat reports` : "No open reports"} />
      </div>
      <Card title="Last 30 days — posts and messages">
        <div className="flex h-32 items-end gap-1">
          {d.days.map((x) => (
            <div key={x.day} title={`${x.day}: ${x.posts} posts, ${x.messages} messages`} className="flex flex-1 items-end gap-px">
              <div className="flex-1 bg-accent" style={{ height: `${(x.posts / max) * 100}%`, minHeight: x.posts ? 2 : 0 }} />
              <div className="flex-1 bg-muted-foreground/40" style={{ height: `${(x.messages / max) * 100}%`, minHeight: x.messages ? 2 : 0 }} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground"><span className="text-accent">■</span> posts &nbsp; <span className="text-muted-foreground">■</span> messages</p>
      </Card>
    </div>
  );
}

export function PostsAdmin() {
  const qc = useQueryClient();
  const can = useCanEdit("community");
  const [status, setStatus] = useState<"all" | "live" | "hidden">("all");
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const q = useQuery({ queryKey: ["admin-posts", status, search], queryFn: () => adminListPosts({ data: { status, q: search } }) });
  const act = async (ids: string[], action: "hide" | "show" | "delete" | "p0" | "p1" | "p2" | "p4") => {
    if (action === "delete" && !confirm(`Delete ${ids.length} post(s) for good?`)) return;
    try { await adminModeratePosts({ data: { ids, action } }); setSel([]); qc.invalidateQueries({ queryKey: ["admin-posts"] }); toast.success("Updated"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't update"); }
  };
  return (
    <div className="space-y-3">
      {!can && <ReadOnlyNote section="community" />}
      <div className="flex flex-wrap gap-2">
        {(["all", "live", "hidden"] as const).map((s) => <button key={s} onClick={() => setStatus(s)} className={`min-h-9 border px-3 text-xs capitalize ${status === s ? "border-foreground bg-foreground text-background" : "border-border"}`}>{s}</button>)}
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search captions" className="min-h-9 min-w-40 flex-1 border border-border bg-background px-3 text-sm" />
      </div>
      {can && sel.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border border-border bg-muted/40 p-2 text-xs">
          <b>{sel.length} selected</b>
          <button onClick={() => act(sel, "hide")} className="border border-border px-2 py-1">Hide</button>
          <button onClick={() => act(sel, "show")} className="border border-border px-2 py-1">Show</button>
          {PUSH.map(([k, l]) => <button key={k} onClick={() => act(sel, k as "p1")} className="border border-border px-2 py-1">{l}</button>)}
          <button onClick={() => act(sel, "delete")} className="border border-destructive px-2 py-1 text-destructive">Delete</button>
        </div>
      )}
      {!q.data ? <Spinner /> : !q.data.length ? <Empty>No photo posts.</Empty> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {q.data.map((p) => (
            <div key={p.id} className={`border ${sel.includes(p.id) ? "border-accent" : "border-border"}`}>
              <a href={`/p/${p.id}`} target="_blank" rel="noreferrer" className="relative block aspect-square bg-muted">
                {p.thumb && <img src={p.thumb} alt="" loading="lazy" className="h-full w-full object-cover" />}
                <span className="absolute left-1 top-1"><StatusBadge status={p.status === "live" ? "active" : "hidden"} label={p.status} /></span>
              </a>
              <div className="space-y-1 p-2 text-xs">
                <label className="flex items-center gap-2"><input type="checkbox" disabled={!can} checked={sel.includes(p.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))} /> <b className="truncate">@{p.creator}</b></label>
                <p className="line-clamp-2 text-muted-foreground">{p.caption || "No caption"}</p>
                <p>{p.photos} photos · {p.likes} likes · {p.comments} comments</p>
                <p>Push: {PUSH.find(([k]) => k === `p${p.priority}`)?.[1] ?? p.priority}</p>
                {can && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    <button onClick={() => act([p.id], p.status === "live" ? "hide" : "show")} className="border border-border px-2 py-1">{p.status === "live" ? "Hide" : "Show"}</button>
                    <select value={`p${p.priority}`} onChange={(e) => act([p.id], e.target.value as "p1")} className="border border-border bg-background px-1 py-1">
                      {PUSH.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                    <button onClick={() => act([p.id], "delete")} className="border border-destructive px-2 py-1 text-destructive">Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReportsAdmin() {
  const qc = useQueryClient();
  const can = useCanEdit("community");
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["admin-reports"], queryFn: () => adminReports() });
  const chat = useQuery({ queryKey: ["admin-report-chat", open], enabled: !!open, queryFn: () => adminReportedChat({ data: { reportId: open! } }) });
  if (!q.data) return <Spinner />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Private chats are only visible here after one of the two people reports them.</p>
      {!q.data.length && <Empty>No reported chats.</Empty>}
      {q.data.map((r) => (
        <Card key={r.id}>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge status={r.status === "open" ? "pending" : "active"} label={r.status} />
            <span>@{r.reporter} reported <b>@{r.reported}</b></span>
            <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString("en-IN")}</span>
            <div className="ml-auto flex gap-2">
              <button onClick={() => setOpen(open === r.id ? null : r.id)} className="border border-border px-3 py-1 text-xs">{open === r.id ? "Close chat" : "Read chat"}</button>
              {r.reportedId && <a href={`/admin/customers/${r.reportedId}`} className="border border-border px-3 py-1 text-xs">Account access</a>}
              {can && r.status === "open" && <button onClick={async () => { await adminResolveReport({ data: { id: r.id } }); qc.invalidateQueries({ queryKey: ["admin-reports"] }); }} className="bg-foreground px-3 py-1 text-xs text-background">Mark resolved</button>}
            </div>
          </div>
          <p className="mt-2 text-sm">Reason: {r.reason}</p>
          {open === r.id && (
            <div className="mt-3 max-h-80 space-y-1 overflow-y-auto border-t border-border pt-3 text-sm">
              {!chat.data ? <Spinner /> : chat.data.map((m) => <p key={m.id}><b>@{m.from}:</b> {m.body} <span className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString("en-IN")}</span></p>)}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

export function BroadcastAdmin() {
  const can = useCanEdit("community");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Card title="Send an announcement">
      {!can && <ReadOnlyNote section="community" />}
      <p className="text-sm text-muted-foreground">Appears in every member's notifications (heart icon) instantly.</p>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={200} rows={3} placeholder="e.g. New drop goes live tonight at 8 PM" className="mt-3 w-full border border-border bg-background p-3 text-sm" />
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{body.length}/200</span>
        <button disabled={!can || busy || body.trim().length < 3} onClick={async () => {
          if (!confirm("Send this to everyone?")) return;
          setBusy(true);
          try { const r = await adminBroadcast({ data: { body } }); toast.success(`Sent to ${r.sent} members`); setBody(""); }
          catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't send"); } finally { setBusy(false); }
        }} className="zk-label min-h-10 bg-accent px-5 text-xs text-accent-foreground disabled:opacity-40">{busy ? "Sending…" : "Send to everyone"}</button>
      </div>
    </Card>
  );
}
