import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/catalog";
import { Card, PageHeader, StatusBadge } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["admin-dash"],
    queryFn: async () => {
      const since = new Date(); since.setHours(0, 0, 0, 0);
      const [orders, low, recent] = await Promise.all([
        supabase.from("orders").select("total, status, created_at").neq("status", "pending"),
        supabase.from("product_variants").select("id, title, stock, products(title, handle)").lte("stock", 3).order("stock").limit(10),
        supabase.from("orders").select("id, order_number, email, total, status, created_at").neq("status", "pending").order("created_at", { ascending: false }).limit(8),
      ]);
      const all = (orders.data ?? []).filter((o) => o.status !== "refunded" && o.status !== "cancelled");
      const today = all.filter((o) => new Date(o.created_at) >= since);
      return {
        todaySales: today.reduce((s, o) => s + Number(o.total), 0),
        todayOrders: today.length,
        totalSales: all.reduce((s, o) => s + Number(o.total), 0),
        toShip: all.filter((o) => o.status === "paid").length,
        low: low.data ?? [],
        recent: recent.data ?? [],
      };
    },
  });

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Today's sales" value={formatMoney(data?.todaySales ?? 0)} />
        <Stat label="Today's orders" value={String(data?.todayOrders ?? 0)} />
        <Stat label="Orders to ship" value={String(data?.toShip ?? 0)} />
        <Stat label="All-time sales" value={formatMoney(data?.totalSales ?? 0)} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <h2 className="zk-label mb-3 text-xs">Recent orders</h2>
          {data?.recent.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
          <div className="divide-y divide-border">
            {data?.recent.map((o) => (
              <Link key={o.id} to="/admin/orders" search={{ id: o.id }} className="flex items-center justify-between gap-3 py-2 text-sm hover:opacity-80">
                <span>#{o.order_number} · <span className="text-muted-foreground">{o.email}</span></span>
                <span className="flex items-center gap-3"><StatusBadge status={o.status} /> {formatMoney(o.total)}</span>
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="zk-label mb-3 text-xs">Low stock</h2>
          {data?.low.length === 0 && <p className="text-sm text-muted-foreground">All sizes well stocked.</p>}
          {data?.low.map((v) => (
            <div key={v.id} className="flex justify-between py-1 text-sm">
              <span className="truncate">{v.products?.title} · {v.title}</span>
              <span className={v.stock === 0 ? "text-destructive" : ""}>{v.stock}</span>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <Card><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></Card>;
}
