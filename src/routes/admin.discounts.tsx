import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { adminDeleteDiscount, adminListDiscounts, adminSaveDiscount } from "@/lib/admin/marketing.functions";
import { Card, Empty, Field, PageHeader, ReadOnlyNote, Spinner, StatusBadge, Toggle, btn, btnGhost, dateOnly, inputCls, inr, useAction, useCanEdit } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/discounts")({ component: Discounts });

type D = {
  id?: string; code: string; description: string; kind: "percent" | "fixed" | "free_shipping"; value: string; min_order: string;
  starts_at: string; expires_at: string; usage_limit: string; first_order_only: boolean; once_per_customer: boolean; active: boolean;
};
const BLANK: D = { code: "", description: "", kind: "percent", value: "10", min_order: "0", starts_at: "", expires_at: "", usage_limit: "", first_order_only: false, once_per_customer: false, active: true };
const toInput = (s: string | null) => (s ? new Date(s).toISOString().slice(0, 10) : "");

function Discounts() {
  const q = useQuery({ queryKey: ["admin-discounts"], queryFn: () => adminListDiscounts() });
  const canEdit = useCanEdit("discounts");
  const { busy, run } = useAction();
  const [d, setD] = useState<D | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!d) return;
    const ok = await run("save", () => adminSaveDiscount({
      data: {
        ...(d.id ? { id: d.id } : {}), code: d.code, description: d.description, kind: d.kind, value: Number(d.value || 0), min_order: Number(d.min_order || 0),
        starts_at: d.starts_at ? new Date(d.starts_at).toISOString() : null,
        expires_at: d.expires_at ? new Date(d.expires_at + "T23:59:59+05:30").toISOString() : null,
        usage_limit: d.usage_limit ? Number(d.usage_limit) : null, first_order_only: d.first_order_only, once_per_customer: d.once_per_customer, active: d.active,
      },
    }), "Discount saved", ["admin-discounts"]);
    if (ok) setD(null);
  };

  const describe = (x: { kind: string; value: number; min_order: number }) =>
    `${x.kind === "percent" ? `${Number(x.value)}% off` : x.kind === "fixed" ? `${inr(x.value)} off` : "Free shipping"}${Number(x.min_order) > 0 ? ` on orders over ${inr(x.min_order)}` : ""}`;

  return (
    <div>
      <PageHeader title="Discounts" action={canEdit && !d && <button onClick={() => setD(BLANK)} className={btn}><Plus className="h-4 w-4" /> Create discount</button>} />
      <ReadOnlyNote section="discounts" />
      {d && (
        <Card className="mb-4" title={d.id ? `Edit ${d.code}` : "New discount code"}>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Field label="Code"><input required value={d.code} onChange={(e) => setD({ ...d, code: e.target.value.toUpperCase() })} placeholder="DROP15" className={inputCls} /></Field>
            <Field label="Type">
              <select value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as D["kind"] })} className={inputCls}>
                <option value="percent">Percentage off</option><option value="fixed">Fixed amount off (₹)</option><option value="free_shipping">Free shipping</option>
              </select>
            </Field>
            {d.kind !== "free_shipping" && <Field label={d.kind === "percent" ? "Percent off" : "Amount off (₹)"}><input required type="number" min={1} value={d.value} onChange={(e) => setD({ ...d, value: e.target.value })} className={inputCls} /></Field>}
            <Field label="Minimum order (₹)"><input type="number" min={0} value={d.min_order} onChange={(e) => setD({ ...d, min_order: e.target.value })} className={inputCls} /></Field>
            <Field label="Starts (optional)"><input type="date" value={d.starts_at} onChange={(e) => setD({ ...d, starts_at: e.target.value })} className={inputCls} /></Field>
            <Field label="Ends (optional)"><input type="date" value={d.expires_at} onChange={(e) => setD({ ...d, expires_at: e.target.value })} className={inputCls} /></Field>
            <Field label="Total uses allowed (optional)"><input type="number" min={1} value={d.usage_limit} onChange={(e) => setD({ ...d, usage_limit: e.target.value })} className={inputCls} /></Field>
            <Field label="Internal description"><input value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} className={inputCls} /></Field>
            <div className="sm:col-span-2">
              <Toggle checked={d.first_order_only} onChange={(v) => setD({ ...d, first_order_only: v })} label="Only for a customer's first order" />
              <Toggle checked={d.once_per_customer} onChange={(v) => setD({ ...d, once_per_customer: v })} label="One use per customer" />
              <Toggle checked={d.active} onChange={(v) => setD({ ...d, active: v })} label="Active" />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button disabled={!!busy} className={btn}>{busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />} Save</button>
              <button type="button" onClick={() => setD(null)} className={btnGhost}>Cancel</button>
            </div>
          </form>
        </Card>
      )}
      {q.isLoading ? <Spinner /> : !q.data?.length ? <Empty>No discount codes yet.</Empty> : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
          {q.data.map((x) => {
            const expired = x.expires_at && new Date(x.expires_at) < new Date();
            return (
              <li key={x.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <button disabled={!canEdit} onClick={() => setD({ id: x.id, code: x.code, description: x.description, kind: x.kind as D["kind"], value: String(x.value), min_order: String(x.min_order), starts_at: toInput(x.starts_at), expires_at: toInput(x.expires_at), usage_limit: x.usage_limit ? String(x.usage_limit) : "", first_order_only: x.first_order_only, once_per_customer: x.once_per_customer, active: x.active })} className="min-w-0 flex-1 text-left">
                  <p className="font-mono font-semibold">{x.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {describe({ kind: x.kind, value: Number(x.value), min_order: Number(x.min_order) })}
                    {x.first_order_only ? " · first order only" : ""}{x.expires_at ? ` · ends ${dateOnly(x.expires_at)}` : ""}
                  </p>
                </button>
                <span className="text-xs text-muted-foreground">{x.used_count}{x.usage_limit ? ` / ${x.usage_limit}` : ""} used</span>
                <StatusBadge status={x.active && !expired ? "active" : "archived"} label={!x.active ? "Off" : expired ? "Expired" : "Active"} />
                {canEdit && <button onClick={() => { if (confirm(`Delete ${x.code}?`)) void run("del", () => adminDeleteDiscount({ data: { id: x.id } }), "Deleted", ["admin-discounts"]); }} aria-label="Delete" className="grid h-9 w-9 place-items-center text-muted-foreground"><Trash2 className="h-4 w-4" /></button>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
