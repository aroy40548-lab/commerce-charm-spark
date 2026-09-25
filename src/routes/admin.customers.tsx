import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/catalog";
import { Card, inputCls, PageHeader, StatusBadge } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/customers")({ component: Customers });

function Customers() {
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { data } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const [p, o, a] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("id, user_id, order_number, total, status, created_at").neq("status", "pending"),
        supabase.from("addresses").select("*"),
      ]);
      return { profiles: p.data ?? [], orders: o.data ?? [], addresses: a.data ?? [] };
    },
  });
  const list = (data?.profiles ?? []).filter((p) => `${p.email} ${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <PageHeader title="Customers" />
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" className={`${inputCls} mb-4 max-w-sm`} />
      <Card className="divide-y divide-border p-0">
        {list.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No customers yet.</p>}
        {list.map((p) => {
          const orders = data!.orders.filter((o) => o.user_id === p.id);
          const spent = orders.filter((o) => o.status !== "refunded" && o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0);
          return (
            <div key={p.id}>
              <button onClick={() => setOpen(open === p.id ? null : p.id)} className="flex w-full items-center justify-between gap-3 p-3 text-left text-sm hover:bg-muted/50">
                <span><b>{[p.first_name, p.last_name].filter(Boolean).join(" ") || "—"}</b> <span className="text-muted-foreground">{p.email}</span></span>
                <span className="text-muted-foreground">{orders.length} orders · {formatMoney(spent)}</span>
              </button>
              {open === p.id && (
                <div className="grid gap-4 bg-muted/30 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="zk-label mb-2 text-[10px]">Orders</p>
                    {orders.length === 0 && <p className="text-muted-foreground">None</p>}
                    {orders.map((o) => (
                      <Link key={o.id} to="/admin/orders" search={{ id: o.id }} className="flex justify-between py-1 hover:underline">
                        <span>#{o.order_number} <StatusBadge status={o.status} /></span><span>{formatMoney(o.total)}</span>
                      </Link>
                    ))}
                  </div>
                  <div>
                    <p className="zk-label mb-2 text-[10px]">Addresses</p>
                    {data!.addresses.filter((a) => a.user_id === p.id).map((a) => (
                      <p key={a.id} className="mb-2 text-muted-foreground">{a.full_name}, {a.phone}<br />{[a.address1, a.address2, a.city, a.state, a.pincode].filter(Boolean).join(", ")}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </>
  );
}
