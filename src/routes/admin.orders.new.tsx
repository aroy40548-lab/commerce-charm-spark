import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Minus, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createDraftOrder, searchVariants } from "@/lib/admin/orders.functions";
import { AddressFields, EMPTY_ADDRESS, type AddressInput } from "@/components/AddressForm";
import { Card, Field, PageHeader, ReadOnlyNote, btn, inr, inputCls, useAction, useCanEdit } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/orders/new")({ component: NewOrder });

type Line = { variantId: string; product: string; variant: string; image: string | null; price: number; quantity: number; stock: number };

function NewOrder() {
  const navigate = useNavigate();
  const canEdit = useCanEdit("orders");
  const { busy, run } = useAction();
  const [term, setTerm] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState<AddressInput>(EMPTY_ADDRESS);
  const [discount, setDiscount] = useState(0);
  const [shipping, setShipping] = useState(100);
  const [payment, setPayment] = useState<"paid" | "cod" | "pending">("paid");
  const [note, setNote] = useState("");
  const results = useQuery({ queryKey: ["variant-search", term], enabled: term.trim().length > 1, queryFn: () => searchVariants({ data: { q: term } }) });

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const add = (r: NonNullable<typeof results.data>[number]) => {
    setLines((ls) => ls.some((l) => l.variantId === r.variantId) ? ls.map((l) => l.variantId === r.variantId ? { ...l, quantity: l.quantity + 1 } : l) : [...ls, { ...r, quantity: 1 }]);
    setTerm("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lines.length) { toast.error("Add at least one product"); return; }
    const res = await run("create", () => createDraftOrder({
      data: { email, address, lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, price: l.price })), discount, shipping, payment, note },
    }), "Order created", ["admin-orders", "admin-dashboard"]);
    if (res) navigate({ to: "/admin/orders/$id", params: { id: res.id } });
  };

  return (
    <form onSubmit={submit}>
      <PageHeader back="/admin/orders" title="Create order" subtitle="For orders taken on WhatsApp, Instagram, phone or in person." />
      <ReadOnlyNote section="orders" />
      <fieldset disabled={!canEdit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card title="Products">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search products to add" className={`${inputCls} pl-9`} />
              {term.trim().length > 1 && (
                <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
                  {results.isLoading && <p className="p-3 text-sm text-muted-foreground">Searching…</p>}
                  {results.data?.length === 0 && <p className="p-3 text-sm text-muted-foreground">No products found.</p>}
                  {results.data?.map((r) => (
                    <button type="button" key={r.variantId} onClick={() => add(r)} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted">
                      {r.image ? <img src={r.image} alt="" className="h-9 w-9 rounded object-cover" /> : <div className="h-9 w-9 rounded bg-muted" />}
                      <span className="min-w-0 flex-1 truncate">{r.product} · {r.variant}</span>
                      <span className={`text-xs ${r.stock ? "text-muted-foreground" : "text-destructive"}`}>{r.stock} in stock</span>
                      <span>{inr(r.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <ul className="mt-3 divide-y divide-border">
              {lines.map((l) => (
                <li key={l.variantId} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  {l.image ? <img src={l.image} alt="" className="h-11 w-11 rounded object-cover" /> : <div className="h-11 w-11 rounded bg-muted" />}
                  <span className="min-w-0 flex-1"><span className="block truncate">{l.product}</span><span className="text-xs text-muted-foreground">{l.variant} · {l.stock} in stock</span></span>
                  <input type="number" min={0} value={l.price} onChange={(e) => setLines(lines.map((x) => x.variantId === l.variantId ? { ...x, price: Number(e.target.value) } : x))} aria-label="Price" className={`${inputCls} w-24`} />
                  <div className="flex items-center rounded-lg border border-border">
                    <button type="button" aria-label="Less" onClick={() => setLines(lines.map((x) => x.variantId === l.variantId ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))} className="grid h-9 w-9 place-items-center"><Minus className="h-3 w-3" /></button>
                    <span className="w-6 text-center">{l.quantity}</span>
                    <button type="button" aria-label="More" onClick={() => setLines(lines.map((x) => x.variantId === l.variantId ? { ...x, quantity: x.quantity + 1 } : x))} className="grid h-9 w-9 place-items-center"><Plus className="h-3 w-3" /></button>
                  </div>
                  <button type="button" aria-label="Remove" onClick={() => setLines(lines.filter((x) => x.variantId !== l.variantId))} className="grid h-9 w-9 place-items-center text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Customer">
            <div className="space-y-3">
              <Field label="Email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>
              <AddressFields value={address} onChange={setAddress} />
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Summary">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{inr(subtotal)}</span></div>
              <Field label="Discount (₹)"><input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className={inputCls} /></Field>
              <Field label="Shipping (₹)"><input type="number" min={0} value={shipping} onChange={(e) => setShipping(Number(e.target.value))} className={inputCls} /></Field>
              <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Total</span><span>{inr(Math.max(subtotal - discount, 0) + shipping)}</span></div>
              <Field label="Payment">
                <select value={payment} onChange={(e) => setPayment(e.target.value as typeof payment)} className={inputCls}>
                  <option value="paid">Already paid (UPI/cash)</option>
                  <option value="cod">Cash on delivery</option>
                  <option value="pending">Payment pending</option>
                </select>
              </Field>
              <Field label="Internal note"><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputCls} /></Field>
              <button disabled={!!busy} className={`${btn} w-full`}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Create order</button>
              <p className="text-[11px] text-muted-foreground">Paid and COD orders take stock right away.</p>
            </div>
          </Card>
        </div>
      </fieldset>
    </form>
  );
}
