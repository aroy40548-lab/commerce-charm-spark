import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, IndianRupee, X } from "lucide-react";
import { toast } from "sonner";
import { adminDecideCommissions, adminListAffiliates, adminListCommissions, adminUpdateAffiliate } from "@/lib/admin/marketing.functions";
import { Card, Empty, PageHeader, ReadOnlyNote, Spinner, Stat, StatusBadge, Tabs, btn, btnGhost, dateOnly, inr, useAction, useCanEdit } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/marketing")({ component: Marketing });

type CStatus = "pending" | "approved" | "paid" | "rejected" | "all";
const C_LABEL: Record<string, string> = { pending: "Waiting approval", approved: "Approved", paid: "Paid out", rejected: "Rejected" };

function Marketing() {
  const [tab, setTab] = useState<"commissions" | "affiliates">("commissions");
  const affs = useQuery({ queryKey: ["admin-affiliates"], queryFn: () => adminListAffiliates() });
  const totals = (affs.data?.affiliates ?? []).reduce((t, a) => ({ pending: t.pending + a.pending, approved: t.approved + a.approved, paid: t.paid + a.paid, sales: t.sales + a.sales }), { pending: 0, approved: 0, paid: 0, sales: 0 });
  return (
    <div>
      <PageHeader title="Affiliates"
        subtitle={<>Anyone can join at <a href="/affiliate" target="_blank" rel="noreferrer" className="underline">zankyo.in/affiliate</a>. They earn {affs.data?.defaultRate ?? 5}% after you approve each sale. Change the rate in <Link to="/admin/settings" className="underline">Settings</Link>.</>} />
      <ReadOnlyNote section="marketing" />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Affiliate sales" value={inr(totals.sales)} />
        <Stat label="Waiting approval" value={inr(totals.pending)} />
        <Stat label="Approved, to pay" value={inr(totals.approved)} />
        <Stat label="Paid out" value={inr(totals.paid)} />
      </div>
      <Tabs value={tab} onChange={setTab} options={[["commissions", "Commissions"], ["affiliates", `Affiliates (${affs.data?.affiliates.length ?? 0})`]]} />
      {tab === "commissions" ? <Commissions /> : <AffiliateList data={affs.data} loading={affs.isLoading} />}
    </div>
  );
}

function Commissions() {
  const [status, setStatus] = useState<CStatus>("pending");
  const [picked, setPicked] = useState<string[]>([]);
  const canEdit = useCanEdit("marketing");
  const { busy, run } = useAction();
  const q = useQuery({ queryKey: ["admin-commissions", status], queryFn: () => adminListCommissions({ data: { status } }) });
  const decide = (decision: "approved" | "rejected" | "paid", ids = picked) =>
    run(decision, () => adminDecideCommissions({ data: { ids, decision } }), decision === "paid" ? "Marked as paid out" : `Commission ${decision}`, ["admin-commissions", "admin-affiliates", "admin-dashboard"]).then(() => setPicked([]));

  return (
    <div>
      <Tabs value={status} onChange={(s) => { setStatus(s); setPicked([]); }} options={[["pending", "To approve"], ["approved", "Approved · to pay"], ["paid", "Paid"], ["rejected", "Rejected"], ["all", "All"]]} />
      {canEdit && picked.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
          <span>{picked.length} selected</span>
          {status === "pending" && <button disabled={!!busy} onClick={() => decide("approved")} className={btn}><Check className="h-4 w-4" /> Approve</button>}
          {status === "approved" && <button disabled={!!busy} onClick={() => decide("paid")} className={btn}><IndianRupee className="h-4 w-4" /> Mark paid out</button>}
          {(status === "pending" || status === "approved") && <button disabled={!!busy} onClick={() => decide("rejected")} className={btnGhost}><X className="h-4 w-4" /> Reject</button>}
        </div>
      )}
      {q.isLoading ? <Spinner /> : !q.data?.length ? <Empty>Nothing here.</Empty> : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
          {q.data.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-3 py-3 text-sm">
              {canEdit && (c.status === "pending" || c.status === "approved") && (
                <input type="checkbox" aria-label="Select" checked={picked.includes(c.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, c.id] : picked.filter((x) => x !== c.id))} />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{inr(c.amount)} to <b>{c.affiliates?.code}</b> <span className="font-normal text-muted-foreground">({c.affiliates?.name || c.affiliates?.email})</span></p>
                <p className="text-xs text-muted-foreground">
                  {c.orders && <Link to="/admin/orders/$id" params={{ id: c.orders.id }} className="underline">ZK{c.orders.order_number}</Link>} · order {c.orders?.status} · {c.rate}% of {inr(c.order_amount)} · {dateOnly(c.created_at)}
                  {c.affiliates?.payout_upi ? ` · UPI ${c.affiliates.payout_upi}` : " · no UPI yet"}
                  {c.note ? ` · ${c.note}` : ""}
                </p>
              </div>
              <StatusBadge status={c.status} label={C_LABEL[c.status]} />
              {canEdit && c.status === "pending" && (
                <div className="flex gap-1">
                  <button disabled={!!busy} onClick={() => decide("approved", [c.id])} className={btnGhost} aria-label="Approve"><Check className="h-4 w-4" /></button>
                  <button disabled={!!busy} onClick={() => decide("rejected", [c.id])} className={btnGhost} aria-label="Reject"><X className="h-4 w-4" /></button>
                </div>
              )}
              {canEdit && c.status === "approved" && <button disabled={!!busy} onClick={() => decide("paid", [c.id])} className={btnGhost}>Paid</button>}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Tip: approve once the order is delivered and past the return window. Cancelled or refunded orders are rejected automatically.</p>
    </div>
  );
}

function AffiliateList({ data, loading }: { data: Awaited<ReturnType<typeof adminListAffiliates>> | undefined; loading: boolean }) {
  const canEdit = useCanEdit("marketing");
  const { run } = useAction();
  if (loading) return <Spinner />;
  if (!data?.affiliates.length) return <Empty>No affiliates yet. Share zankyo.in/affiliate with creators and customers.</Empty>;
  return (
    <Card>
      <ul className="divide-y divide-border">
        {data.affiliates.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-semibold">{a.code}
                <button onClick={() => navigator.clipboard?.writeText(`https://zankyo.in/?ref=${a.code}`).then(() => toast.success("Link copied"))} aria-label="Copy link" className="text-muted-foreground"><Copy className="h-3.5 w-3.5" /></button>
              </p>
              <p className="text-xs text-muted-foreground">{a.name || a.email} · {a.clicks} clicks · {a.orders} orders · {inr(a.sales)} sales · joined {dateOnly(a.created_at)}</p>
            </div>
            <span className="text-xs text-muted-foreground">Rate</span>
            <input type="number" min={0} max={50} step="0.5" disabled={!canEdit} defaultValue={a.commission_rate ?? ""} placeholder={String(data.defaultRate)} aria-label="Commission rate"
              onBlur={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); if (v !== (a.commission_rate == null ? null : Number(a.commission_rate))) void run("rate", () => adminUpdateAffiliate({ data: { id: a.id, commission_rate: v } }), "Rate updated", ["admin-affiliates"]); }}
              className="min-h-9 w-16 rounded-lg border border-border bg-background px-2 text-right text-sm" />
            <StatusBadge status={a.status} />
            {canEdit && <button onClick={() => void run("st", () => adminUpdateAffiliate({ data: { id: a.id, status: a.status === "active" ? "suspended" : "active" } }), a.status === "active" ? "Affiliate paused" : "Affiliate re-activated", ["admin-affiliates"])} className="text-xs underline">{a.status === "active" ? "Pause" : "Activate"}</button>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
