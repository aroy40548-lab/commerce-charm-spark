import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Megaphone, MessageSquareQuote, PackageCheck, ShoppingCart } from "lucide-react";
import { getDashboard } from "@/lib/admin/core.functions";
import { Card, Spinner, Stat, StatusBadge, Tabs, dateTime, inr, useStaff } from "@/components/admin/ui";
import { SalesChart } from "@/components/admin/SalesChart";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function Dashboard() {
  const me = useStaff();
  const [days, setDays] = useState(7);
  const q = useQuery({ queryKey: ["admin-dashboard", days], queryFn: () => getDashboard({ data: { days } }) });
  const d = q.data;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Hi, {me.name.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">Here's what's happening with ZANKYO.</p>
        </div>
      </div>
      <Tabs value={String(days)} onChange={(v) => setDays(Number(v))} options={[["1", "Today"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"]]} />
      {!d ? <Spinner /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Total sales" value={inr(d.sales)} />
            <Stat label="Orders" value={d.orders} />
            <Stat label="Average order" value={inr(d.aov)} />
            <Stat label="Customers" value={d.customers} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Todo to="/admin/orders" search={{ view: "unfulfilled" }} icon={<PackageCheck className="h-4 w-4" />} n={d.toFulfil} label={d.toFulfil === 1 ? "order to ship" : "orders to ship"} />
            <Todo to="/admin/abandoned" icon={<ShoppingCart className="h-4 w-4" />} n={d.abandoned} label={d.abandoned === 1 ? "abandoned checkout this week" : "abandoned checkouts this week"} />
            <Todo to="/admin/marketing" icon={<Megaphone className="h-4 w-4" />} n={d.pendingCommissions} label={d.pendingCommissions === 1 ? "commission to approve" : "commissions to approve"} />
            <Todo to="/admin/reviews" icon={<MessageSquareQuote className="h-4 w-4" />} n={d.newReviews} label={d.newReviews === 1 ? "new review this week" : "new reviews this week"} />
          </div>

          <Card title="Sales per day">
            {d.orders === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No sales in this period yet.</p> : <SalesChart data={d.chart} />}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Recent orders" action={<Link to="/admin/orders" className="text-xs underline">View all</Link>}>
              {d.recent.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet.</p> : (
                <ul className="divide-y divide-border">
                  {d.recent.map((o) => (
                    <li key={o.id}>
                      <Link to="/admin/orders/$id" params={{ id: o.id }} className="flex items-center gap-3 py-2.5 text-sm">
                        <span className="w-16 shrink-0 font-semibold">ZK{o.order_number}</span>
                        <span className="min-w-0 flex-1 truncate text-muted-foreground">{o.customer_name || o.email}<br /><span className="text-[11px]">{dateTime(o.created_at)}</span></span>
                        <StatusBadge status={o.status} />
                        <span className="w-16 shrink-0 text-right font-medium">{inr(o.total)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Low stock" action={<Link to="/admin/inventory" search={{ filter: "low" }} className="text-xs underline">Inventory</Link>}>
              {d.lowStock.length === 0 ? <p className="text-sm text-muted-foreground">Everything is well stocked.</p> : (
                <ul className="divide-y divide-border">
                  {d.lowStock.slice(0, 10).map((v) => (
                    <li key={v.id}>
                      <Link to="/admin/products/$id" params={{ id: v.productId }} className="flex items-center gap-3 py-2.5 text-sm">
                        <AlertTriangle className={`h-4 w-4 shrink-0 ${v.stock === 0 ? "text-destructive" : "text-amber-600"}`} />
                        <span className="min-w-0 flex-1 truncate">{v.product} · {v.variant}</span>
                        <span className={`font-semibold ${v.stock === 0 ? "text-destructive" : ""}`}>{v.stock === 0 ? "Sold out" : `${v.stock} left`}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Todo({ to, search, icon, n, label }: { to: string; search?: Record<string, string>; icon: React.ReactNode; n: number; label: string }) {
  return (
    <Link to={to} search={search as never} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${n > 0 ? "border-foreground/30 bg-background" : "border-border bg-background/60 text-muted-foreground"}`}>
      {icon}
      <span className="min-w-0 flex-1"><b className="text-foreground">{n}</b> {label}</span>
      <ArrowRight className="h-4 w-4 shrink-0" />
    </Link>
  );
}
