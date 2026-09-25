import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCartStore } from "@/stores/cartStore";
import { formatMoney } from "@/lib/catalog";
import { createOrder, quoteCart, verifyPayment } from "@/lib/orders.functions";
import { AddressFields, EMPTY_ADDRESS, formatAddress, type AddressInput } from "@/components/AddressForm";

export const Route = createFileRoute("/checkout")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Checkout — ZANKYO" },
      { name: "description", content: "Secure checkout with Razorpay: UPI, cards and netbanking." },
      { property: "og:title", content: "Checkout — ZANKYO" },
      { property: "og:description", content: "Complete your ZANKYO order." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Checkout,
});

declare global {
  interface Window { Razorpay?: new (o: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void } }
}

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function Checkout() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [addrId, setAddrId] = useState<string | "new">("new");
  const [addr, setAddr] = useState<AddressInput>(EMPTY_ADDRESS);
  const [saveAddr, setSaveAddr] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  const quote = useServerFn(quoteCart);
  const create = useServerFn(createOrder);
  const verify = useServerFn(verifyPayment);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { next: "/checkout" }, replace: true });
  }, [loading, user, navigate]);

  const lines = items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
  const { data: q, error: qErr } = useQuery({
    queryKey: ["quote", lines, applied],
    enabled: lines.length > 0,
    queryFn: () => quote({ data: { lines, code: applied } }),
    retry: false,
  });

  const { data: addresses } = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("addresses").select("*").eq("user_id", user!.id).order("is_default", { ascending: false })).data ?? [],
  });
  useEffect(() => {
    if (addresses && addresses.length > 0 && addrId === "new") setAddrId(addresses[0]!.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses]);

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="zk-display text-4xl">Thank you!</h1>
        <p className="mt-3 text-sm text-muted-foreground">Order #{done} is confirmed and paid. We'll email you when it ships.</p>
        <Link to="/account" className="zk-label mt-8 inline-block rounded-full bg-foreground px-6 py-3 text-xs text-background">View my orders</Link>
      </div>
    );
  }

  if (!user) return null;
  if (items.length === 0) {
    return (
      <div className="py-24 text-center text-sm">
        <p>Your bag is empty.</p>
        <Link to="/shop" search={{ q: undefined, category: undefined }} className="mt-4 inline-block underline">Continue shopping</Link>
      </div>
    );
  }

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let address: AddressInput;
      if (addrId === "new") {
        address = addr;
        if (saveAddr) await supabase.from("addresses").insert({ ...addr, user_id: user.id, is_default: !addresses?.length });
      } else {
        const a = addresses!.find((x) => x.id === addrId)!;
        address = { full_name: a.full_name, phone: a.phone, address1: a.address1, address2: a.address2 ?? "", city: a.city, state: a.state, pincode: a.pincode, country: a.country };
      }
      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) throw new Error("Couldn't load the payment window. Check your connection.");
      const order = await create({ data: { lines, code: applied, address } });
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: "INR",
        name: "ZANKYO",
        description: `Order #${order.orderNumber}`,
        order_id: order.razorpayOrderId,
        prefill: { name: address.full_name, email: order.email, contact: address.phone },
        theme: { color: "#5a1a24" },
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await verify({ data: { orderId: order.orderId, ...r } });
            clearCart();
            setDone(order.orderNumber);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Payment verification failed");
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on("payment.failed", () => { toast.error("Payment failed. Please try again."); setBusy(false); });
      rzp.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start payment");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={pay} className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="zk-display text-4xl">Checkout</h1>
        <h2 className="zk-label mt-8 text-sm">Delivery address</h2>
        <div className="mt-3 space-y-2">
          {addresses?.map((a) => (
            <label key={a.id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 text-sm ${addrId === a.id ? "border-foreground" : "border-border"}`}>
              <input type="radio" checked={addrId === a.id} onChange={() => setAddrId(a.id)} />
              <span><b>{a.full_name}</b> · {a.phone}<br /><span className="text-muted-foreground">{formatAddress({ ...a, address2: a.address2 ?? "" })}</span></span>
            </label>
          ))}
          <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 text-sm ${addrId === "new" ? "border-foreground" : "border-border"}`}>
            <input type="radio" checked={addrId === "new"} onChange={() => setAddrId("new")} /> Use a new address
          </label>
          {addrId === "new" && (
            <div className="space-y-3 rounded-xl border border-border p-4">
              <AddressFields value={addr} onChange={setAddr} />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} /> Save this address to my account
              </label>
            </div>
          )}
        </div>
      </div>

      <aside className="h-fit space-y-4 rounded-xl bg-card p-6">
        <h2 className="zk-label text-sm">Order summary</h2>
        {items.map((i) => (
          <div key={i.variantId} className="flex justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{i.product.node.title} · {i.variantTitle} ×{i.quantity}</span>
            <span>{formatMoney(parseFloat(i.price.amount) * i.quantity)}</span>
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Discount code" className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none" />
          <button type="button" onClick={() => setApplied(code || null)} className="zk-label rounded-full bg-muted px-4 text-[11px]">Apply</button>
        </div>
        {q?.discountError && <p className="text-xs text-destructive">{q.discountError}</p>}
        {qErr && <p className="text-xs text-destructive">{(qErr as Error).message}</p>}
        {q && (
          <div className="space-y-1 border-t border-border pt-3 text-sm">
            <Row label="Subtotal" v={formatMoney(q.subtotal)} />
            {q.discount > 0 && <Row label={`Discount (${q.discountCode})`} v={`-${formatMoney(q.discount)}`} />}
            <Row label="Shipping" v={q.shipping === 0 ? "Free" : formatMoney(q.shipping)} />
            <div className="flex justify-between pt-2 text-lg font-bold"><span>Total</span><span>{formatMoney(q.total)}</span></div>
          </div>
        )}
        <button disabled={busy || !q} className="zk-label flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-xs text-background disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ${q ? formatMoney(q.total) : ""} with Razorpay`}
        </button>
        <p className="text-center text-[11px] text-muted-foreground">UPI · Cards · Netbanking · Wallets</p>
      </aside>
    </form>
  );
}

function Row({ label, v }: { label: string; v: string }) {
  return <div className="flex justify-between text-muted-foreground"><span>{label}</span><span>{v}</span></div>;
}
