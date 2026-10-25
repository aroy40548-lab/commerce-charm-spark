import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAnalytics } from "@/lib/admin/core.functions";
import { Card, PageHeader, Spinner, Stat, Tabs, inr } from "@/components/admin/ui";
import { SalesChart } from "@/components/admin/SalesChart";

export const Route = createFileRoute("/admin/analytics")({ component: Analytics });

const orders = (n: number) => `${n} order${n === 1 ? "" : "s"}`;

function Change({ v }: { v: number | null }) {
  if (v === null) return <span>no earlier data</span>;
  const up = v >= 0;
  return <span className={up ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}>{up ? "▲" : "▼"} {Math.abs(v).toFixed(0)}% vs previous period</span>;
}

/** Ranked list with a proportional bar; the value is always printed, so the bar is only a cue. */
function Ranked({ rows, value }: { rows: Array<{ name: string; v: number; note?: string }>; value: (n: number) => string }) {
  const max = Math.max(...rows.map((r) => r.v), 1);
  if (!rows.length) return <p className="text-sm text-muted-foreground">No data for this period.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.name} className="text-sm">
          <div className="flex justify-between gap-3"><span className="min-w-0 truncate">{r.name}</span><span className="shrink-0 font-medium tabular-nums">{value(r.v)}{r.note && <span className="ml-1 text-xs font-normal text-muted-foreground">{r.note}</span>}</span></div>
          <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-foreground" style={{ width: `${(r.v / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

function Analytics() {
  const [days, setDays] = useState(30);
  const q = useQuery({ queryKey: ["admin-analytics", days], queryFn: () => getAnalytics({ data: { days } }) });
  const a = q.data;
  return (
    <div>
      <PageHeader title="Analytics" subtitle="Sales count paid and cash-on-delivery orders that weren't cancelled or refunded." />
      <Tabs value={String(days)} onChange={(v) => setDays(Number(v))} options={[["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["365", "12 months"]]} />
      {!a ? <Spinner /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Total sales" value={inr(a.sales)} sub={<Change v={a.salesChange} />} />
            <Stat label="Orders" value={a.orders} sub={<Change v={a.ordersChange} />} />
            <Stat label="Average order value" value={inr(a.aov)} />
            <Stat label="Customers" value={a.customers.total} sub={`${a.customers.returning} returning · ${a.customers.new} new`} />
          </div>
          <Card title="Sales over time"><SalesChart data={a.chart} height={260} /></Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Top products"><Ranked rows={a.topProducts.map((p) => ({ name: p.title, v: p.revenue, note: `${p.qty} sold` }))} value={inr} /></Card>
            <Card title="Sales by collection"><Ranked rows={a.byCategory.map((c) => ({ name: c.name, v: c.sales }))} value={inr} /></Card>
            <Card title="Payment methods"><Ranked rows={a.byPayment.map((c) => ({ name: c.name, v: c.sales, note: orders(c.orders) }))} value={inr} /></Card>
            <Card title="Discount codes used"><Ranked rows={a.byDiscount.map((c) => ({ name: c.name, v: c.orders }))} value={orders} /></Card>
            <Card title="Affiliate sales"><Ranked rows={a.byAffiliate.map((c) => ({ name: c.name, v: c.sales, note: orders(c.orders) }))} value={inr} /></Card>
            <Card title="Other numbers">
              <dl className="space-y-2 text-sm">
                {([["Discounts given", inr(a.discountsGiven)], ["Refunded", inr(a.refunded)], ["Cancelled orders", a.cancelled], ["Unfinished checkouts", a.abandoned]] as const).map(([k, v]) => (
                  <div key={k} className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
                ))}
              </dl>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
