import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Send, ShoppingBag } from "lucide-react";
import { adminLiveVisitors, adminSendNudge } from "@/lib/presence.functions";
import { Empty, PageHeader, Spinner, Stat, Tabs, btn, btnGhost, dateTime, inputCls, inr, useAction, useCanEdit } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/live")({
  head: () => ({ meta: [{ title: "Live visitors · ZANKYO Admin" }, { name: "robots", content: "noindex" }] }),
  component: LiveVisitors,
});

const ago = (iso: string) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

function LiveVisitors() {
  const [filter, setFilter] = useState<"active" | "today" | "all">("active");
  const q = useQuery({ queryKey: ["admin-live", filter], queryFn: () => adminLiveVisitors({ data: { filter } }), refetchInterval: 15_000 });
  const canSend = useCanEdit("customers");
  const { run, busy } = useAction();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const send = async () => {
    const r = await run("send", () => adminSendNudge({ data: { userIds: [...picked], body, link } }), "Message sent — it pops up on their screen");
    if (r) { setBody(""); setLink(""); setPicked(new Set()); }
  };

  const rows = q.data?.rows ?? [];
  return (
    <div>
      <PageHeader title="Live visitors" subtitle="Signed-in customers: who is on the site right now, what's in their bag, and what they've bought. Updates every 15 seconds." />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Active now" value={<span className="flex items-center gap-2"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />{q.data?.activeNow ?? "—"}</span>} />
        <Stat label="Shown" value={rows.length} />
        <Stat label="With items in bag" value={rows.filter((r) => r.cartCount > 0).length} />
        <Stat label="Bag value (shown)" value={inr(rows.reduce((n, r) => n + r.cartValue, 0))} />
      </div>
      <Tabs value={filter} onChange={setFilter} options={[["active", "Active now"], ["today", "Last 24 hours"], ["all", "Everyone"]]} />

      {canSend && picked.size > 0 && (
        <div className="sticky top-2 z-10 mb-4 space-y-2 rounded-xl border border-border bg-card p-3 shadow-lg">
          <p className="text-sm font-semibold">Message {picked.size} customer{picked.size === 1 ? "" : "s"} — only they will see it on their screen</p>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={280} rows={2} placeholder="e.g. Hey! Use FIRST20 in the next hour for 20% off your bag 🔥" className={inputCls} />
          <div className="flex flex-wrap gap-2">
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Optional button link, e.g. /checkout" className={`${inputCls} flex-1`} />
            <button className={btnGhost} onClick={() => setPicked(new Set())}>Clear</button>
            <button className={btn} disabled={!body.trim() || busy === "send"} onClick={send}><Send className="h-4 w-4" />Send</button>
          </div>
        </div>
      )}

      {q.isLoading ? <Spinner /> : !rows.length ? <Empty>{filter === "active" ? "No signed-in customers on the site right now." : "No visitors yet."}</Empty> : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
          {rows.map((r) => (
            <li key={r.userId} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                {canSend && <input type="checkbox" checked={picked.has(r.userId)} onChange={() => toggle(r.userId)} aria-label={`Select ${r.name}`} className="h-4 w-4 accent-primary" />}
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.active ? "bg-primary" : "bg-muted-foreground/40"}`} title={r.active ? "Active now" : "Away"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.name}{r.username && <span className="ml-1 font-normal text-muted-foreground">@{r.username}</span>}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.active ? `On ${r.path}` : `Last seen ${ago(r.lastSeen)} on ${r.path}`} · {r.device || "—"} · {r.visits} visit{r.visits === 1 ? "" : "s"}
                  </p>
                </div>
                <button onClick={() => setOpen(open === r.userId ? null : r.userId)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs">
                  <ShoppingBag className="h-3.5 w-3.5" />{r.cartCount} · {inr(r.cartValue)}
                </button>
                <span className="text-xs text-muted-foreground tabular-nums">{r.orders} order{r.orders === 1 ? "" : "s"} · {inr(r.spent)}</span>
              </div>
              {open === r.userId && (
                <div className="mt-2 rounded-lg bg-muted/40 p-3 text-xs">
                  <p className="text-muted-foreground">This visit started {dateTime(r.sessionStart)} · first seen {dateTime(r.firstSeen)} · {r.email}</p>
                  {r.cartItems.length ? (
                    <ul className="mt-2 space-y-1">{r.cartItems.map((c, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate">{c.title}{c.variant && c.variant !== "Default Title" ? ` (${c.variant})` : ""} × {c.qty}</span><span className="tabular-nums">{inr(c.price * c.qty)}</span></li>)}</ul>
                  ) : <p className="mt-2">Bag is empty.</p>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
