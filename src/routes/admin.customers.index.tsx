import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import { adminExportCustomers, adminListCustomers } from "@/lib/admin/customers.functions";
import { Empty, PageHeader, Spinner, Tabs, btnGhost, dateOnly, inputCls, inr, useAction, useCanEdit } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/customers/")({ component: Customers });

type Segment = "all" | "repeat" | "none" | "big" | "recent" | "affiliates";

function Customers() {
  const navigate = useNavigate();
  const [segment, setSegment] = useState<Segment>("all");
  const [q, setQ] = useState("");
  const canEdit = useCanEdit("customers");
  const { busy, run } = useAction();
  const res = useQuery({ queryKey: ["admin-customers", segment, q], queryFn: () => adminListCustomers({ data: { segment, q } }) });

  const exportCsv = async () => {
    const csv = await run("csv", () => adminExportCustomers());
    if (!csv) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `zankyo-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div>
      <PageHeader title="Customers" subtitle={res.data ? `${res.data.length} customer${res.data.length === 1 ? "" : "s"}` : undefined}
        action={canEdit && <button disabled={!!busy} onClick={exportCsv} className={btnGhost}><Download className="h-4 w-4" /> Export CSV</button>} />
      <Tabs value={segment} onChange={setSegment} options={[["all", "All"], ["repeat", "Repeat buyers"], ["big", "Spent ₹5,000+"], ["recent", "Bought in last 30 days"], ["none", "No orders yet"], ["affiliates", "Affiliates"]]} />
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone or tag" className={`${inputCls} pl-9`} />
      </div>
      {res.isLoading ? <Spinner /> : !res.data?.length ? <Empty>No customers in this segment.</Empty> : (
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr><th className="px-4 py-2.5">Customer</th><th className="hidden px-4 py-2.5 sm:table-cell">Joined</th><th className="px-4 py-2.5">Orders</th><th className="px-4 py-2.5 text-right">Spent</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {res.data.map((c) => (
                <tr key={c.id} onClick={() => navigate({ to: "/admin/customers/$id", params: { id: c.id } })} className="cursor-pointer hover:bg-muted/40">
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{c.name || c.email}</p>
                    <p className="text-xs text-muted-foreground">{c.name ? c.email : ""}{c.affiliate ? " · affiliate" : ""}{c.tags.length ? ` · ${c.tags.join(", ")}` : ""}</p>
                  </td>
                  <td className="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">{dateOnly(c.joined)}</td>
                  <td className="px-4 py-2.5">{c.orders}</td>
                  <td className="px-4 py-2.5 text-right">{inr(c.spent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
