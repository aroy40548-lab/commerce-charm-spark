import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Ban, CheckCircle2, Loader2, Printer, RefreshCw, RotateCcw, Truck, Wallet } from "lucide-react";
import { addOrderNote, getOrder, orderAction } from "@/lib/admin/orders.functions";
import { Card, Field, PageHeader, ReadOnlyNote, Spinner, StatusBadge, btn, btnDanger, btnGhost, dateTime, inr, inputCls, useAction, useCanEdit } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/orders/$id")({ component: OrderDetail });

const COURIERS = ["Delhivery", "Shiprocket", "Blue Dart", "DTDC", "Ekart", "XpressBees", "India Post", "Self delivery"];

function OrderDetail() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: ["admin-order", id], queryFn: () => getOrder({ data: { id } }) });
  const canEdit = useCanEdit("orders");
  const { busy, run } = useAction();
  const [ship, setShip] = useState<{ courier: string; awb: string; url: string } | null>(null);
  const [note, setNote] = useState("");
  const o = q.data;
  if (!o) return <Spinner />;

  const inv = ["admin-order", "admin-orders", "admin-dashboard"];
  const act = (key: string, data: NonNullable<Parameters<typeof orderAction>[0]>["data"], msg: string) => run(key, () => orderAction({ data }), msg, inv);
  const a = o.shipping_address as Record<string, string>;
  const canShip = ["paid", "confirmed"].includes(o.status);

  return (
    <div>
      <PageHeader
        back="/admin/orders"
        title={`ZK${o.order_number}`}
        subtitle={<span className="flex flex-wrap items-center gap-2"><StatusBadge status={o.status} /> {dateTime(o.created_at)} · {o.source === "draft" ? "Created in admin" : "Online store"}</span>}
        action={<button onClick={() => window.print()} className={btnGhost}><Printer className="h-4 w-4" /> Print</button>}
      />
      <ReadOnlyNote section="orders" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card title={`Items (${o.order_items.reduce((s, i) => s + i.quantity, 0)})`}>
            <ul className="divide-y divide-border">
              {o.order_items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-2.5 text-sm">
                  {i.image_url ? <img src={i.image_url} alt="" className="h-12 w-12 rounded-md object-cover" /> : <div className="h-12 w-12 rounded-md bg-muted" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{i.title}</span>
                    <span className="text-xs text-muted-foreground">{i.variant_title}{i.sku ? ` · SKU ${i.sku}` : ""}</span>
                  </span>
                  <span className="text-muted-foreground">{inr(i.price)} × {i.quantity}</span>
                  <span className="w-20 text-right font-medium">{inr(Number(i.price) * i.quantity)}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Payment">
            <dl className="space-y-1.5 text-sm">
              <Row k="Subtotal" v={inr(o.subtotal)} />
              {Number(o.discount) > 0 && <Row k={`Discount${o.discount_code ? ` (${o.discount_code})` : ""}`} v={`−${inr(o.discount)}`} />}
              <Row k={`Shipping (${o.shipping_method === "express" ? "Express" : "Standard"})`} v={Number(o.shipping) ? inr(o.shipping) : "Free"} />
              {Number(o.cod_fee) > 0 && <Row k="COD fee" v={inr(o.cod_fee)} />}
              {Number(o.gift_card_amount) > 0 && <Row k={`Gift card (${o.gift_card_code})`} v={`−${inr(o.gift_card_amount)}`} />}
              <div className="flex justify-between border-t border-border pt-2 font-semibold"><dt>Total</dt><dd>{inr(o.total)}</dd></div>
              <Row k="Method" v={o.payment_method === "cod" ? "Cash on delivery" : o.payment_method === "razorpay" ? "Razorpay" : o.payment_method} />
              <Row k="Paid" v={o.paid_at ? dateTime(o.paid_at) : "Not yet"} />
              {o.razorpay_payment_id && <Row k="Razorpay payment" v={o.razorpay_payment_id} />}
              {o.refund_id && <Row k="Refund ID" v={o.refund_id} />}
            </dl>
            {canEdit && !o.paid_at && ["pending", "confirmed", "shipped", "delivered"].includes(o.status) && (
              <button disabled={!!busy} onClick={() => act("paid", { action: "mark_paid", id }, "Marked as paid")} className={`${btnGhost} mt-3`}>
                {busy === "paid" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />} {o.payment_method === "cod" ? "Cash collected" : "Mark as paid"}
              </button>
            )}
          </Card>

          <Card title="Fulfilment">
            {o.status === "pending" && <p className="text-sm text-muted-foreground">Waiting for payment. Nothing to ship yet.</p>}
            {(o.courier_name || o.awb_code) && (
              <div className="mb-3 rounded-lg bg-muted/60 p-3 text-sm">
                <p><b>{o.courier_name}</b>{o.awb_code && ` · ${o.awb_code}`}</p>
                {o.tracking_status && <p className="text-muted-foreground">Status: {o.tracking_status}</p>}
                {o.tracking_url && <a href={o.tracking_url} target="_blank" rel="noreferrer" className="text-xs underline">Open tracking</a>}
              </div>
            )}
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                {canShip && !ship && <button onClick={() => setShip({ courier: "Delhivery", awb: "", url: "" })} className={btn}><Truck className="h-4 w-4" /> Add tracking & ship</button>}
                {canShip && <button disabled={!!busy} onClick={() => act("sr", { action: "shiprocket", id }, "Shiprocket shipment created")} className={btnGhost}>{busy === "sr" && <Loader2 className="h-4 w-4 animate-spin" />} Ship with Shiprocket</button>}
                {o.status === "shipped" && o.awb_code && <button disabled={!!busy} onClick={() => act("track", { action: "refresh_tracking", id }, "Tracking updated")} className={btnGhost}><RefreshCw className="h-4 w-4" /> Refresh tracking</button>}
                {o.status === "shipped" && <button disabled={!!busy} onClick={() => act("deliver", { action: "deliver", id }, "Marked delivered")} className={btnGhost}><CheckCircle2 className="h-4 w-4" /> Mark delivered</button>}
              </div>
            )}
            {ship && (
              <form className="mt-3 grid gap-3 sm:grid-cols-3" onSubmit={async (e) => { e.preventDefault(); if (await act("ship", { action: "fulfill", id, courier: ship.courier, awb: ship.awb, url: ship.url }, "Order shipped — customer emailed")) setShip(null); }}>
                <Field label="Courier"><input list="couriers" required value={ship.courier} onChange={(e) => setShip({ ...ship, courier: e.target.value })} className={inputCls} /></Field>
                <datalist id="couriers">{COURIERS.map((c) => <option key={c} value={c} />)}</datalist>
                <Field label="Tracking number"><input value={ship.awb} onChange={(e) => setShip({ ...ship, awb: e.target.value })} className={inputCls} /></Field>
                <Field label="Tracking link (optional)"><input type="url" value={ship.url} onChange={(e) => setShip({ ...ship, url: e.target.value })} placeholder="https://" className={inputCls} /></Field>
                <div className="flex gap-2 sm:col-span-3">
                  <button disabled={!!busy} className={btn}>{busy === "ship" && <Loader2 className="h-4 w-4 animate-spin" />} Mark as shipped</button>
                  <button type="button" onClick={() => setShip(null)} className={btnGhost}>Cancel</button>
                </div>
              </form>
            )}
          </Card>

          <Card title="Timeline">
            {canEdit && (
              <form className="mb-4 flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (await run("note", () => addOrderNote({ data: { id, note } }), "Note added", inv)) setNote(""); }}>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal note…" className={inputCls} />
                <button disabled={!note.trim() || !!busy} className={btnGhost}>Post</button>
              </form>
            )}
            <ol className="space-y-3 border-l border-border pl-4">
              {[...o.order_events].reverse().map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-muted-foreground" />
                  <p>{e.message}</p>
                  <p className="text-xs text-muted-foreground">{dateTime(e.created_at)}{e.actor && e.actor !== "system" ? ` · ${e.actor}` : ""}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Customer">
            <div className="space-y-1 text-sm">
              <p className="font-medium">{o.customer_name || "—"}</p>
              {o.user_id ? <Link to="/admin/customers/$id" params={{ id: o.user_id }} className="block text-xs underline">{o.customerOrders} order{o.customerOrders === 1 ? "" : "s"} · view customer</Link> : <p className="text-xs text-muted-foreground">Guest / admin order</p>}
              <a href={`mailto:${o.email}`} className="block truncate text-muted-foreground underline">{o.email}</a>
              {o.phone && <a href={`tel:${o.phone}`} className="block text-muted-foreground underline">{o.phone}</a>}
              {o.phone && <a href={`https://wa.me/${o.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}`} target="_blank" rel="noreferrer" className="block text-xs underline">WhatsApp customer</a>}
            </div>
          </Card>
          <Card title="Shipping address">
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {[a["full_name"], a["address1"], a["address2"], `${a["city"] ?? ""}, ${a["state"] ?? ""} ${a["pincode"] ?? ""}`, a["phone"]].filter(Boolean).join("\n")}
            </p>
          </Card>
          {o.customer_note && <Card title="Customer note"><p className="text-sm">{o.customer_note}</p></Card>}
          {o.affiliate && (
            <Card title="Affiliate">
              <p className="text-sm"><b>{o.affiliate.code}</b> · {o.affiliate.name || o.affiliate.email}</p>
              {o.commission && <p className="mt-1 text-sm text-muted-foreground">Commission {inr(o.commission.amount)} ({o.commission.rate}%) · <StatusBadge status={o.commission.status} label={o.commission.status === "pending" ? "Waiting approval" : undefined} /></p>}
              <Link to="/admin/marketing" className="mt-2 block text-xs underline">Review commissions</Link>
            </Card>
          )}
          {canEdit && !["cancelled", "refunded"].includes(o.status) && (
            <Card title="More actions">
              <div className="flex flex-col gap-2">
                {!["shipped", "delivered"].includes(o.status) && (
                  <button disabled={!!busy} className={btnDanger} onClick={() => { const r = prompt("Reason for cancelling (shown to the customer):", ""); if (r !== null) void act("cancel", { action: "cancel", id, reason: r }, "Order cancelled, stock returned"); }}>
                    <Ban className="h-4 w-4" /> Cancel order
                  </button>
                )}
                {(o.paid_at || o.razorpay_payment_id) && (
                  <button disabled={!!busy} className={btnDanger} onClick={() => {
                    const via = !!o.razorpay_payment_id && confirm(`Refund ${inr(o.total)} to the customer through Razorpay now?\n\nOK = refund through Razorpay\nCancel = I already paid them back another way`);
                    const r = prompt("Reason for the refund:", "");
                    if (r !== null) void act("refund", { action: "refund", id, reason: r, viaRazorpay: via }, "Refund recorded, stock returned");
                  }}>
                    <RotateCcw className="h-4 w-4" /> Refund
                  </button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="truncate text-right">{v}</dd></div>;
}
