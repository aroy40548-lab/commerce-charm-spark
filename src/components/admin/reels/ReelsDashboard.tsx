import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Heart, MessageCircle, ShoppingBag, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar } from "@/components/ReelsFeed";
import { Card, Empty, Stat, StatusBadge, btnDanger, btnGhost, dateTime, inputCls, inr, useAction, useCanEdit } from "@/components/admin/ui";
import { ACCOUNT_STATUSES } from "@/lib/accountStatus";
import { PRIORITIES } from "@/lib/reels";
import { adminBulkReels, adminModerateReel, adminReelsDashboard, adminSetPriority } from "@/lib/reels.functions";

export type Dash = Awaited<ReturnType<typeof adminReelsDashboard>>;
type Reel = Dash["reels"][number];
const KEY = ["admin-reels-dash"];
const sel = "min-h-9 rounded-lg border border-border bg-background px-2 text-xs";
const prioLabel = (v: number) => PRIORITIES.find((p) => p.value === v)?.label ?? String(v);

// ---------- Overview ----------
export function Overview({ d, onOpen }: { d: Dash; onOpen: (id: string) => void }) {
  const o = d.overview;
  const maxV = Math.max(1, ...d.days.map((x) => x.views));
  const maxR = Math.max(1, ...d.days.map((x) => x.reels));
  const topReels = [...d.reels].sort((a, b) => b.views - a.views).slice(0, 5);
  const topCreators = [...d.creators].sort((a, b) => b.views - a.views).slice(0, 5);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total reels" value={o.total} sub={`${o.live} live · ${o.hidden} hidden`} />
        <Stat label="Views" value={o.views.toLocaleString("en-IN")} />
        <Stat label="Likes" value={o.likes.toLocaleString("en-IN")} sub={`${o.comments} comments`} />
        <Stat label="New this week" value={o.newThisWeek} sub={`${o.creators} active creators`} />
        <Stat label="Orders from reels" value={o.orders} sub={inr(o.revenue)} />
        <Stat label="Partner commission pending" value={inr(o.commission.pending)} />
        <Stat label="Approved" value={inr(o.commission.approved)} />
        <Stat label="Paid out" value={inr(o.commission.paid)} />
      </div>
      <Card title="Last 30 days">
        <div className="flex h-40 items-end gap-[3px]" role="img" aria-label="Views and new reels per day">
          {d.days.map((x) => (
            <div key={x.day} className="group relative flex h-full flex-1 flex-col justify-end gap-[2px]" title={`${x.day}: ${x.views} views, ${x.reels} new reels`}>
              <div className="w-full rounded-t-sm bg-foreground/80" style={{ height: `${(x.views / maxV) * 85}%` }} />
              <div className="w-full bg-accent" style={{ height: `${(x.reels / maxR) * 15}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
          <span>{d.days[0]?.day}</span>
          <span className="flex gap-3"><span className="flex items-center gap-1"><i className="h-2 w-2 bg-foreground/80" /> Views</span><span className="flex items-center gap-1"><i className="h-2 w-2 bg-accent" /> New reels</span></span>
          <span>Today</span>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Top reels">
          {topReels.length ? <ul className="divide-y divide-border">{topReels.map((r) => (
            <li key={r.id}><button onClick={() => onOpen(r.id)} className="flex w-full items-center gap-3 py-2 text-left text-sm">
              <span className="min-w-0 flex-1 truncate">{r.caption || "(no caption)"} <span className="text-muted-foreground">· @{r.username ?? r.creator}</span></span>
              <span className="shrink-0 text-xs text-muted-foreground">{r.views} views · {r.orders} orders</span>
            </button></li>
          ))}</ul> : <Empty>No reels yet.</Empty>}
        </Card>
        <Card title="Top creators">
          {topCreators.length ? <ul className="divide-y divide-border">{topCreators.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2 text-sm">
              <Avatar url={c.avatarUrl} label={c.username ?? c.name} />
              <span className="min-w-0 flex-1 truncate">{c.name} <span className="text-muted-foreground">@{c.username}</span></span>
              <span className="shrink-0 text-xs text-muted-foreground">{c.views} views · {inr(c.earnings)}</span>
            </li>
          ))}</ul> : <Empty>No creators yet.</Empty>}
        </Card>
      </div>
    </div>
  );
}

// ---------- Reels grid ----------
export function ReelsGrid({ d, onOpen }: { d: Dash; onOpen: (id: string) => void }) {
  const canEdit = useCanEdit("community");
  const { busy, run } = useAction();
  const [filter, setFilter] = useState<"all" | "live" | "hidden" | "boosted">("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"new" | "views" | "likes" | "sales">("new");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return d.reels
      .filter((r) => filter === "all" || (filter === "live" ? r.status === "live" : filter === "hidden" ? r.status !== "live" : r.priority > 1))
      .filter((r) => !t || r.caption.toLowerCase().includes(t) || (r.username ?? r.creator).toLowerCase().includes(t))
      .sort((a, b) => sort === "views" ? b.views - a.views : sort === "likes" ? b.likes - a.likes : sort === "sales" ? b.orders - a.orders : Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [d.reels, filter, q, sort]);
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const bulk = (action: "hide" | "show" | "priority", value?: 0 | 1 | 2 | 4) =>
    void run("bulk", () => adminBulkReels({ data: { ids: [...picked], action, ...(value !== undefined ? { value } : {}) } }), "Updated", KEY).then(() => setPicked(new Set()));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "live", "hidden", "boosted"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`min-h-9 rounded-full border px-4 text-xs capitalize ${filter === f ? "border-foreground bg-foreground text-background" : "border-border"}`}>{f}</button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search caption or @username" aria-label="Search reels" className={`${inputCls} max-w-xs flex-1`} />
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort" className={sel}>
          <option value="new">Newest</option><option value="views">Most viewed</option><option value="likes">Most liked</option><option value="sales">Most sales</option>
        </select>
      </div>
      {canEdit && picked.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background p-2 text-xs shadow-sm">
          <b className="px-2">{picked.size} selected</b>
          <button disabled={!!busy} onClick={() => bulk("hide")} className={btnGhost}><EyeOff className="h-3.5 w-3.5" /> Hide</button>
          <button disabled={!!busy} onClick={() => bulk("show")} className={btnGhost}><Eye className="h-3.5 w-3.5" /> Show</button>
          <select defaultValue="" onChange={(e) => e.target.value && bulk("priority", Number(e.target.value) as 0 | 1 | 2 | 4)} aria-label="Set push" className={sel}>
            <option value="" disabled>Set push…</option>
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <button onClick={() => setPicked(new Set())} className="ml-auto underline">Clear</button>
        </div>
      )}
      {!list.length ? <Empty>No reels match.</Empty> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((r) => (
            <div key={r.id} className={`overflow-hidden rounded-xl border bg-background ${picked.has(r.id) ? "border-foreground ring-1 ring-foreground" : "border-border"}`}>
              <button onClick={() => onOpen(r.id)} className="relative block aspect-[9/16] w-full bg-ink">
                <video src={`${r.videoUrl}#t=0.5`} muted playsInline preload="metadata" className="pointer-events-none h-full w-full object-cover" />
                <span className="absolute left-2 top-2 flex gap-1">
                  {r.status !== "live" && <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">Hidden</span>}
                  {r.priority !== 1 && <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">{prioLabel(r.priority)}</span>}
                </span>
                <span className="absolute inset-x-0 bottom-0 flex flex-wrap gap-x-2 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 text-[11px] font-semibold text-white">
                  <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{r.views}</span>
                  <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{r.likes}</span>
                  <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" />{r.comments}</span>
                  <span className="flex items-center gap-0.5"><ShoppingBag className="h-3 w-3" />{r.orders}</span>
                </span>
              </button>
              <div className="flex items-start gap-2 p-2">
                {canEdit && <input type="checkbox" checked={picked.has(r.id)} onChange={() => toggle(r.id)} aria-label="Select reel" className="mt-1 h-4 w-4" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">@{r.username ?? r.creator}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.caption || "(no caption)"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Reel side panel ----------
export function ReelPanel({ d, id, onClose }: { d: Dash; id: string | null; onClose: () => void }) {
  const r = d.reels.find((x) => x.id === id) ?? null;
  const canEdit = useCanEdit("community");
  const { busy, run } = useAction();
  const comments = d.comments.filter((c) => c.reelId === id);
  const mod = (action: "hide" | "show" | "delete" | "hideComment" | "showComment" | "deleteComment", target: string) => {
    if (action.startsWith("delete") && !confirm("Delete permanently?")) return;
    void run(action, () => adminModerateReel({ data: { action, id: target } }), "Done", KEY).then(() => { if (action === "delete") onClose(); });
  };
  const creatorPrio = d.creators.find((c) => c.id === r?.creatorId)?.priority ?? 1;
  return (
    <Sheet open={!!r} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {r && (
          <>
            <SheetHeader>
              <SheetTitle>@{r.username ?? r.creator}</SheetTitle>
              <SheetDescription>{dateTime(r.createdAt)} · {r.status === "live" ? "Live" : "Hidden"}</SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-4 text-sm">
              <video src={r.videoUrl} controls playsInline className="mx-auto aspect-[9/16] max-h-[55vh] rounded-lg bg-ink" />
              {r.caption && <p>{r.caption}</p>}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {[["Views", r.views], ["Likes", r.likes], ["Dislikes", r.dislikes], ["Comments", r.comments], ["Orders", r.orders], ["Partner earnings", inr(r.earnings)]].map(([l, v]) => (
                  <div key={l as string} className="rounded-lg bg-muted/60 p-2"><p className="text-muted-foreground">{l}</p><p className="text-base font-bold">{v}</p></div>
                ))}
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Tagged products</p>
                {r.products.length ? r.products.map((p) => <p key={p.id}>{p.title} · {inr(p.price)}</p>) : <p className="text-muted-foreground">None</p>}
              </div>
              {canEdit && (
                <div className="space-y-2 rounded-xl border border-border p-3">
                  <div className="flex flex-wrap gap-2">
                    <button disabled={!!busy} onClick={() => mod(r.status === "live" ? "hide" : "show", r.id)} className={btnGhost}>{r.status === "live" ? <><EyeOff className="h-4 w-4" /> Hide</> : <><Eye className="h-4 w-4" /> Show</>}</button>
                    <button disabled={!!busy} onClick={() => mod("delete", r.id)} className={btnDanger}><Trash2 className="h-4 w-4" /> Delete</button>
                  </div>
                  <label className="flex items-center justify-between gap-2 text-xs">Reel push
                    <select value={r.priority} onChange={(e) => void run("p", () => adminSetPriority({ data: { kind: "reel", id: r.id, value: Number(e.target.value) as 0 | 1 | 2 | 4 } }), "Push updated", KEY)} className={sel}>
                      {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-2 text-xs">Creator push (all their reels)
                    <select value={creatorPrio} onChange={(e) => void run("cp", () => adminSetPriority({ data: { kind: "creator", id: r.creatorId, value: Number(e.target.value) as 0 | 1 | 2 | 4 } }), "Push updated", KEY)} className={sel}>
                      {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </label>
                </div>
              )}
              <Link to="/admin/customers/$id" params={{ id: r.creatorId }} className="block text-xs underline">Creator account access</Link>
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Comments ({comments.length})</p>
                <ul className="divide-y divide-border">
                  {comments.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 py-2">
                      <span className={`min-w-0 flex-1 ${c.hidden ? "text-muted-foreground line-through" : ""}`}><b>{c.name}:</b> {c.body}</span>
                      {canEdit && <>
                        <button onClick={() => mod(c.hidden ? "showComment" : "hideComment", c.id)} className="text-xs underline">{c.hidden ? "Show" : "Hide"}</button>
                        <button onClick={() => mod("deleteComment", c.id)} aria-label="Delete comment" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------- Creators ----------
export function Creators({ d }: { d: Dash }) {
  const canEdit = useCanEdit("community");
  const { run } = useAction();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"views" | "followers" | "orders" | "earnings" | "reels">("views");
  const list = d.creators
    .filter((c) => !q.trim() || `${c.name} ${c.username ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b[sort] - a[sort]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search creators" aria-label="Search creators" className={`${inputCls} max-w-xs flex-1`} />
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort" className={sel}>
          <option value="views">Most views</option><option value="followers">Most followers</option><option value="orders">Most sales</option><option value="earnings">Top earnings</option><option value="reels">Most reels</option>
        </select>
      </div>
      {!list.length ? <Empty>No creators yet.</Empty> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>{["Creator", "Reels", "Followers", "Views", "Sales", "Earnings", "Push", "Account", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2"><div className="flex items-center gap-2"><Avatar url={c.avatarUrl} label={c.username ?? c.name} /><div className="min-w-0"><p className="truncate font-medium">{c.name}</p><p className="truncate text-xs text-muted-foreground">@{c.username}</p></div></div></td>
                  <td className="px-3 py-2">{c.reels}</td>
                  <td className="px-3 py-2">{c.followers}</td>
                  <td className="px-3 py-2">{c.views}</td>
                  <td className="px-3 py-2">{c.orders}</td>
                  <td className="px-3 py-2">{inr(c.earnings)}</td>
                  <td className="px-3 py-2">
                    <select disabled={!canEdit} value={c.priority} onChange={(e) => void run("cp", () => adminSetPriority({ data: { kind: "creator", id: c.id, value: Number(e.target.value) as 0 | 1 | 2 | 4 } }), "Push updated", KEY)} aria-label="Creator push" className={sel}>
                      {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={c.status === "active" ? "active" : "cancelled"} label={ACCOUNT_STATUSES.find((s) => s.value === c.status)?.label ?? c.status} /></td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">
                    <Link to="/admin/customers/$id" params={{ id: c.id }} className="underline">Access</Link>
                    {c.username && <> · <Link to="/u/$username" params={{ username: c.username }} target="_blank" className="underline">Profile</Link></>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- Comments ----------
export function Comments({ d, onOpen }: { d: Dash; onOpen: (id: string) => void }) {
  const canEdit = useCanEdit("community");
  const { busy, run } = useAction();
  const [q, setQ] = useState("");
  const [onlyHidden, setOnlyHidden] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const list = d.comments.filter((c) => (!onlyHidden || c.hidden) && (!q.trim() || `${c.body} ${c.name}`.toLowerCase().includes(q.trim().toLowerCase())));
  const bulk = (action: "hideComments" | "showComments" | "deleteComments") => {
    if (action === "deleteComments" && !confirm(`Delete ${picked.size} comments permanently?`)) return;
    void run("bulk", () => adminBulkReels({ data: { ids: [...picked], action } }), "Updated", KEY).then(() => setPicked(new Set()));
  };
  const one = (action: "hideComment" | "showComment" | "deleteComment", id: string) => {
    if (action === "deleteComment" && !confirm("Delete permanently?")) return;
    void run(action, () => adminModerateReel({ data: { action, id } }), "Done", KEY);
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search comments" aria-label="Search comments" className={`${inputCls} max-w-xs flex-1`} />
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={onlyHidden} onChange={(e) => setOnlyHidden(e.target.checked)} /> Hidden only</label>
        {canEdit && picked.size > 0 && (
          <span className="flex flex-wrap gap-2">
            <button disabled={!!busy} onClick={() => bulk("hideComments")} className={btnGhost}>Hide {picked.size}</button>
            <button disabled={!!busy} onClick={() => bulk("showComments")} className={btnGhost}>Show</button>
            <button disabled={!!busy} onClick={() => bulk("deleteComments")} className={btnDanger}>Delete</button>
          </span>
        )}
      </div>
      {!list.length ? <Empty>No comments.</Empty> : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-background">
          {list.map((c) => (
            <li key={c.id} className="flex items-start gap-3 p-3 text-sm">
              {canEdit && <input type="checkbox" checked={picked.has(c.id)} onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} aria-label="Select comment" className="mt-1 h-4 w-4" />}
              <div className="min-w-0 flex-1">
                <p className={c.hidden ? "text-muted-foreground line-through" : ""}><b>{c.name}:</b> {c.body}</p>
                <button onClick={() => onOpen(c.reelId)} className="mt-0.5 truncate text-xs text-muted-foreground underline">on “{c.reelCaption}” · {dateTime(c.createdAt)}</button>
              </div>
              {canEdit && <span className="flex shrink-0 items-center gap-2">
                <button onClick={() => one(c.hidden ? "showComment" : "hideComment", c.id)} className="text-xs underline">{c.hidden ? "Show" : "Hide"}</button>
                <button onClick={() => one("deleteComment", c.id)} aria-label="Delete comment" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

