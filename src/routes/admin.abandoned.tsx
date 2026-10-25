import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, MessageCircle, Trash2 } from "lucide-react";
import { deleteAbandoned, listOrders } from "@/lib/admin/orders.functions";
import { Empty, PageHeader, Spinner, dateTime, inr, useAction, useCanEdit } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/abandoned")({ component: Abandoned });

function Abandoned() {
  const q = useQuery({ queryKey: ["admin-orders", "abandoned"], queryFn: () => listOrders({ data: { view: "abandoned" } }) });
  const canEdit = useCanEdit("orders");
  const { run } = useAction();
  return (
    <div>
      <PageHeader title="Abandoned checkouts" subtitle="People who started paying but didn't finish. A friendly nudge often wins the sale." />
      {q.isLoading ? <Spinner /> : !q.data?.rows.length ? <Empty>No abandoned checkouts.</Empty> : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
          {q.data.rows.map((o) => {
            const wa = o.phone ? `https://wa.me/${o.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}?text=${encodeURIComponent(`Hi ${o.customer_name.split(" ")[0] || ""}! You left something in your ZANKYO bag 👀 Finish your order here: https://zankyo.in/checkout`)}` : null;
            return (
              <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <Link to="/admin/orders/$id" params={{ id: o.id }} className="min-w-0 flex-1">
                  <p className="font-semibold">{o.customer_name || o.email}</p>
                  <p className="text-xs text-muted-foreground">{dateTime(o.created_at)} · {o.items} item{o.items === 1 ? "" : "s"} · {inr(o.total)}</p>
                </Link>
                <a href={`mailto:${o.email}?subject=${encodeURIComponent("Your ZANKYO bag is waiting")}`} className="grid h-9 w-9 place-items-center rounded-lg border border-border" aria-label="Email"><Mail className="h-4 w-4" /></a>
                {wa && <a href={wa} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-lg border border-border" aria-label="WhatsApp"><MessageCircle className="h-4 w-4" /></a>}
                {canEdit && <button onClick={() => { if (confirm("Delete this abandoned checkout?")) void run("del", () => deleteAbandoned({ data: { id: o.id } }), "Deleted", ["admin-orders"]); }} className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
