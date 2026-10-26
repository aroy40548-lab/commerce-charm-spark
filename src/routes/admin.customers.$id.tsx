import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { adminGetCustomer, adminSaveCustomerNote } from "@/lib/admin/customers.functions";
import { AccountStatusCard } from "@/components/admin/AccountStatusCard";
import { Card, Field, PageHeader, Spinner, Stat, StatusBadge, btn, dateOnly, dateTime, inputCls, inr, useAction, useCanEdit } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/customers/$id")({ component: Customer });

function Customer() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: ["admin-customer", id], queryFn: () => adminGetCustomer({ data: { id } }) });
  const canEdit = useCanEdit("customers");
  const { busy, run } = useAction();
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  useEffect(() => {
    if (q.data) { setNote(q.data.note); setTags(q.data.tags.join(", ")); }
  }, [q.data]);
  const c = q.data;
  if (!c) return <Spinner />;
  const p = c.profile;
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Customer";

  return (
    <div>
      <PageHeader back="/admin/customers" title={name} subtitle={`Customer since ${dateOnly(p.created_at)}`} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Amount spent" value={inr(c.spent)} />
            <Stat label="Orders" value={c.orderCount} />
            <Stat label="Average order" value={inr(c.orderCount ? c.spent / c.orderCount : 0)} />
          </div>
          <Card title="Orders">
            {c.orders.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet.</p> : (
              <ul className="divide-y divide-border">
                {c.orders.map((o) => (
                  <li key={o.id}>
                    <Link to="/admin/orders/$id" params={{ id: o.id }} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="w-16 font-semibold">ZK{o.order_number}</span>
                      <span className="flex-1 text-muted-foreground">{dateTime(o.created_at)}</span>
                      <StatusBadge status={o.status} />
                      <span className="w-20 text-right">{inr(o.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {c.reviews.length > 0 && (
            <Card title="Reviews">
              <ul className="space-y-2 text-sm">
                {c.reviews.map((r) => <li key={r.id}><b>{"★".repeat(r.rating)}</b> on {r.product_handle} — <span className="text-muted-foreground">{r.body.slice(0, 120)}</span></li>)}
              </ul>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <Card title="Contact">
            <div className="space-y-1 text-sm">
              <a href={`mailto:${p.email}`} className="block truncate underline">{p.email}</a>
              {p.phone && <a href={`tel:${p.phone}`} className="block underline">{p.phone}</a>}
              {c.affiliate && <p className="pt-1 text-muted-foreground">Affiliate code <b className="text-foreground">{c.affiliate.code}</b> · {c.affiliate.clicks} clicks</p>}
            </div>
          </Card>
          <AccountStatusCard userId={id} />
          <Card title="Addresses">
            {c.addresses.length === 0 ? <p className="text-sm text-muted-foreground">None saved.</p> : c.addresses.map((a) => (
              <p key={a.id} className="mb-2 text-sm text-muted-foreground">{a.full_name}, {[a.address1, a.address2, a.city, a.state, a.pincode].filter(Boolean).join(", ")} · {a.phone}</p>
            ))}
          </Card>
          <Card title="Notes & tags">
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void run("save", () => adminSaveCustomerNote({ data: { id, note, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) } }), "Saved", ["admin-customer", "admin-customers"]); }}>
              <fieldset disabled={!canEdit} className="space-y-3">
                <Field label="Note (staff only)"><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={inputCls} /></Field>
                <Field label="Tags" hint="Comma separated, e.g. VIP, influencer"><input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} /></Field>
                {canEdit && <button disabled={!!busy} className={btn}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save</button>}
              </fieldset>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
