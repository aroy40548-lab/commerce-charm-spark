import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/catalog";
import { createShipment, refreshTracking, refundOrder } from "@/lib/admin.functions";
import { btn, btnGhost, Card, PageHeader, StatusBadge } from "@/components/admin/ui";

type S = { id?: string; status?: string };
export const Route = createFileRoute("/admin/orders")({
  validateSearch: (s: Record<string, unknown>): S => ({
    id: typeof s["id"] === "string" ? s["id"] : undefined,
    status: typeof s["status"] === "string" ? s["status"] : undefined,
  }),
  component: Orders,
});

const STATUSES = ["all", "paid", "shipped", "delivered", "pending", "cancelled", "refunded"];

function Orders() {
  const { id, status } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/orders" });
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders", status],
    queryFn: async () => {
      let q = supabase.from("orders").select("id, order_number, email, total, status, created_at, shipping_address").order("created_at", { ascending: false }).limit(200);
      if (status && status !== "all") q = q.eq("status", status);
      return (await q).data ?? [];
    },
  });

  if (id) return <OrderDetail id={id} onBack={() => navigate({ search: { status } })} />;

  return (
    <>
      <PageHeader title="Orders" />
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => navigate({ search: { status: s === "all" ? undefined : s } })}
            className={`rounded-full px-3 py-1 text-xs capitalize ${(status ?? "all") === s ? "bg-foreground text-background" : "border border-border bg-background"}`}>{s}</button>
        ))}
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr><th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3">Customer</th><th className="p-3">Status</th><th className="p-3 text-right">Total</th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {orders?.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No orders.</td></tr>}
            {orders?.map((o) => (
              <tr key={o.id} onClick={() => navigate({ search: { id: o.id, status } })} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50">
                <td className="p-3 font-medium">#{o.order_number}</td>
                <td className="p-3 text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                <td className="p-3">{(o.shipping_address as { full_name?: string })?.full_name ?? ""}<br /><span className="text-xs text-muted-foreground">{o.email}</span></td>
                <td className="p-3"><StatusBadge status={o.status} /></td>
                <td className="p-3 text-right">{formatMoney(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function OrderDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const ship = useServerFn(createShipment);
  const track = useServerFn(refreshTracking);
  const refund = useServerFn(refundOrder);
  const { data: o } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: async () => (await supabase.from("orders").select("*, order_items(*)").eq("id", id).single()).data,
  });
  if (!o) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const a = o.shipping_address as Record<string, string>;

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try { await fn(); toast.success(ok); qc.invalidateQueries({ queryKey: ["admin-order", id] }); qc.invalidateQueries({ queryKey: ["admin-orders"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(null); }
  };
  const setStatus = (s: string) => run(s, async () => { const { error } = await supabase.from("orders").update({ status: s }).eq("id", id); if (error) throw error; }, `Marked ${s}`);

  return (
    <>
      <button onClick={onBack} className="mb-4 text-sm text-muted-foreground hover:text-foreground">← All orders</button>
      <PageHeader title={`Order #${o.order_number}`} action={<StatusBadge status={o.status} />} />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <h2 className="zk-label mb-3 text-xs">Items</h2>
            {o.order_items.map((i) => (
              <div key={i.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
                {i.image_url && <img src={i.image_url.startsWith("storage:") ? `/api/public/img/${i.image_url.slice(8)}` : i.image_url} alt="" className="h-12 w-12 rounded object-cover" />}
                <span className="flex-1">{i.title} <span className="text-muted-foreground">· {i.variant_title} × {i.quantity}</span></span>
                <span>{formatMoney(Number(i.price) * i.quantity)}</span>
              </div>
            ))}
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatMoney(o.subtotal)}</span></div>
              {Number(o.discount) > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount ({o.discount_code})</span><span>-{formatMoney(o.discount)}</span></div>}
              <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>{formatMoney(o.shipping)}</span></div>
              <div className="flex justify-between font-bold"><span>Total</span><span>{formatMoney(o.total)}</span></div>
            </div>
          </Card>
          <Card>
            <h2 className="zk-label mb-3 text-xs">Payment & shipping</h2>
            <dl className="grid grid-cols-[140px_1fr] gap-y-1 text-sm">
              <dt className="text-muted-foreground">Razorpay payment</dt><dd>{o.razorpay_payment_id ?? "—"}</dd>
              <dt className="text-muted-foreground">Paid at</dt><dd>{o.paid_at ? new Date(o.paid_at).toLocaleString("en-IN") : "—"}</dd>
              <dt className="text-muted-foreground">Shiprocket order</dt><dd>{o.shiprocket_order_id ?? "—"}</dd>
              <dt className="text-muted-foreground">Courier / AWB</dt><dd>{o.courier_name ?? "—"} {o.awb_code ? `· ${o.awb_code}` : ""}</dd>
              <dt className="text-muted-foreground">Tracking</dt><dd>{o.tracking_status ?? "—"}</dd>
              {o.refund_id && <><dt className="text-muted-foreground">Refund</dt><dd>{o.refund_id}</dd></>}
            </dl>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <h2 className="zk-label mb-2 text-xs">Customer</h2>
            <p className="text-sm font-medium">{a["full_name"]}</p>
            <p className="text-sm text-muted-foreground">{o.email}<br />{a["phone"]}</p>
            <p className="mt-2 text-sm text-muted-foreground">{[a["address1"], a["address2"], a["city"], a["state"], a["pincode"]].filter(Boolean).join(", ")}</p>
          </Card>
          <Card className="space-y-2">
            <h2 className="zk-label mb-1 text-xs">Actions</h2>
            {o.status === "paid" && (
              <button disabled={!!busy} className={`${btn} w-full`} onClick={() => run("ship", () => ship({ data: { orderId: id } }), "Shipment created in Shiprocket")}>
                {busy === "ship" && <Loader2 className="h-3 w-3 animate-spin" />} Create Shiprocket shipment
              </button>
            )}
            {o.awb_code && (
              <button disabled={!!busy} className={`${btnGhost} w-full`} onClick={() => run("track", () => track({ data: { orderId: id } }), "Tracking updated")}>Refresh tracking</button>
            )}
            {o.status === "shipped" && <button disabled={!!busy} className={`${btnGhost} w-full`} onClick={() => setStatus("delivered")}>Mark delivered</button>}
            {(o.status === "paid" || o.status === "pending") && <button disabled={!!busy} className={`${btnGhost} w-full`} onClick={() => setStatus("cancelled")}>Cancel order</button>}
            {o.razorpay_payment_id && o.status !== "refunded" && (
              <button disabled={!!busy} className={`${btnGhost} w-full text-destructive`} onClick={() => confirm(`Refund ${formatMoney(o.total)} to the customer?`) && run("refund", () => refund({ data: { orderId: id } }), "Refund issued")}>Refund via Razorpay</button>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
