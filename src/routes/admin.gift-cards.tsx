import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { adminListGiftCards, adminSaveGiftCard } from "@/lib/admin/products.functions";
import { Card, Empty, Field, PageHeader, ReadOnlyNote, Spinner, StatusBadge, btn, btnGhost, dateOnly, inputCls, inr, useAction, useCanEdit } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/gift-cards")({ component: GiftCards });

function GiftCards() {
  const q = useQuery({ queryKey: ["admin-gift-cards"], queryFn: () => adminListGiftCards() });
  const canEdit = useCanEdit("products");
  const { busy, run } = useAction();
  const [form, setForm] = useState<{ code: string; value: string; email: string; note: string; expires: string } | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const r = await run("new", () => adminSaveGiftCard({ data: { code: form.code || undefined, value: Number(form.value), customer_email: form.email || null, note: form.note, expires_at: form.expires || null } }), "Gift card created", ["admin-gift-cards"]);
    if (r) {
      setForm(null);
      if (r.code) { void navigator.clipboard?.writeText(r.code).catch(() => {}); toast.success(`${r.code} copied — send it to the customer`); }
    }
  };

  return (
    <div>
      <PageHeader title="Gift cards" subtitle="Customers enter the code at checkout. Unused balance stays on the card." action={canEdit && !form && <button onClick={() => setForm({ code: "", value: "", email: "", note: "", expires: "" })} className={btn}><Plus className="h-4 w-4" /> Issue gift card</button>} />
      <ReadOnlyNote section="products" />
      {form && (
        <Card className="mb-4" title="New gift card">
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
            <Field label="Value (₹)"><input required type="number" min={1} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={inputCls} /></Field>
            <Field label="Code" hint="Leave empty to generate one"><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className={inputCls} /></Field>
            <Field label="Customer email (optional)"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} /></Field>
            <Field label="Expires (optional)"><input type="date" value={form.expires} onChange={(e) => setForm({ ...form, expires: e.target.value })} className={inputCls} /></Field>
            <Field label="Note"><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Birthday gift, influencer, refund credit…" className={inputCls} /></Field>
            <div className="flex items-end gap-2">
              <button disabled={!!busy} className={btn}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Create</button>
              <button type="button" onClick={() => setForm(null)} className={btnGhost}>Cancel</button>
            </div>
          </form>
        </Card>
      )}
      {q.isLoading ? <Spinner /> : !q.data?.length ? <Empty>No gift cards yet.</Empty> : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
          {q.data.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-mono font-semibold">{g.code}
                  <button onClick={() => navigator.clipboard?.writeText(g.code).then(() => toast.success("Copied"))} aria-label="Copy code" className="text-muted-foreground"><Copy className="h-3.5 w-3.5" /></button>
                </p>
                <p className="text-xs text-muted-foreground">{[g.customer_email, g.note, g.expires_at ? `expires ${dateOnly(g.expires_at)}` : null, `issued ${dateOnly(g.created_at)}`].filter(Boolean).join(" · ")}</p>
              </div>
              <span className="text-right"><b>{inr(g.balance)}</b><span className="text-xs text-muted-foreground"> / {inr(g.initial_value)}</span></span>
              <StatusBadge status={g.active ? "active" : "archived"} label={g.active ? (Number(g.balance) > 0 ? "Active" : "Used up") : "Disabled"} />
              {canEdit && <button onClick={() => void run("t", () => adminSaveGiftCard({ data: { id: g.id, active: !g.active, note: g.note, customer_email: g.customer_email, expires_at: g.expires_at } }), g.active ? "Disabled" : "Enabled", ["admin-gift-cards"])} className="text-xs underline">{g.active ? "Disable" : "Enable"}</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
