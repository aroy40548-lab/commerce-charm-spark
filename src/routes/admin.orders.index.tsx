import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { listOrders } from "@/lib/admin/orders.functions";
import { Empty, PageHeader, Spinner, StatusBadge, Tabs, btn, dateTime, inr, inputCls, useCanEdit } from "@/components/admin/ui";

const VIEWS = [["all", "All"], ["unfulfilled", "To ship"], ["shipped", "Shipped"], ["delivered", "Delivered"], ["cod", "COD"], ["drafts", "Created in admin"], ["cancelled", "Cancelled"], ["refunded", "Refunded"]] as const;
type View = (typeof VIEWS)[number][0];

export const Route = createFileRoute("/admin/orders/")({
  validateSearch: (s: Record<string, unknown>): { view?: View | undefined } => ({
    view: VIEWS.some(([v]) => v === s["view"]) ? (s["view"] as View) : undefined,
  }),
  component: Orders,
});

function Orders() {
  const { view = "all" } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/orders/" });
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const canEdit = useCanEdit("orders");
  const res = useQuery({
    queryKey: ["admin-orders", view, search, page],
    queryFn: () => listOrders({ data: { view, q: search, page } }),
  });

  return (
    <div>
      <PageHeader title="Orders" action={canEdit && <Link to="/admin/orders/new" className={btn}><Plus className="h-4 w-4" /> Create order</Link>} />
      <Tabs value={view} onChange={(v) => { setPage(0); navigate({ search: { view: v === "all" ? undefined : v } }); }} options={VIEWS.map(([v, l]) => [v, l])} />
      <form onSubmit={(e) => { e.preventDefault(); setPage(0); setSearch(q); }} className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order no., name, email or phone" className={`${inputCls} pl-9`} />
        </div>
      </form>
      {res.isLoading ? <Spinner /> : !res.data?.rows.length ? <Empty>No orders here.</Empty> : (
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="hidden bg-muted/50 text-left text-xs text-muted-foreground sm:table-header-group">
              <tr><th className="px-4 py-2.5">Order</th><th className="px-4 py-2.5">Date</th><th className="px-4 py-2.5">Customer</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Items</th><th className="px-4 py-2.5 text-right">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {res.data.rows.map((o) => (
                <tr key={o.id} onClick={() => navigate({ to: "/admin/orders/$id", params: { id: o.id } })} className="cursor-pointer hover:bg-muted/40">
                  <td className="px-4 py-3 font-semibold">
                    <Link to="/admin/orders/$id" params={{ id: o.id }} onClick={(e) => e.stopPropagation()}>ZK{o.order_number}</Link>
                    <div className="mt-0.5 text-xs font-normal text-muted-foreground sm:hidden">{o.customer_name || o.email}</div>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{dateTime(o.created_at)}</td>
                  <td className="hidden max-w-48 truncate px-4 py-3 sm:table-cell">{o.customer_name || o.email}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} />{o.payment_method === "cod" && o.status !== "confirmed" && <span className="ml-1 text-[11px] text-muted-foreground">COD</span>}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{o.items}</td>
                  <td className="px-4 py-3 text-right font-medium">{inr(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {res.data && res.data.count > 50 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="underline disabled:opacity-40">Previous</button>
          <span className="text-muted-foreground">Page {page + 1} of {Math.ceil(res.data.count / 50)}</span>
          <button disabled={(page + 1) * 50 >= res.data.count} onClick={() => setPage(page + 1)} className="underline disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
