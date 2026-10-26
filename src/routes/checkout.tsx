import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Loader2, Lock, ShoppingBag, Truck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { useAuth } from "@/hooks/useAuth";
import { SignInPanel } from "@/components/SignInPanel";
import { AddressFields, EMPTY_ADDRESS, formatAddress, type AddressInput } from "@/components/AddressForm";
import { confirmPayment, getCheckoutConfig, placeOrder, quoteCheckout } from "@/lib/checkout.functions";
import { getMyAddresses } from "@/lib/account.functions";
import { formatMoney } from "@/lib/catalog";
import { readReferral, readReferralFull } from "@/lib/referral";

export const Route = createFileRoute("/checkout")({
  ssr: false,
  head: () => ({ meta: [{ title: "Checkout — ZANKYO" }, { name: "robots", content: "noindex" }] }),
  component: Checkout,
});

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
declare global {
  interface Window { Razorpay?: new (o: Record<string, unknown>) => { open: () => void; on: (e: string, cb: () => void) => void } }
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

const box = "rounded-2xl border border-border p-4 sm:p-5";
const h2 = "zk-label text-xs";

function Checkout() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const lines = useMemo(() => items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })), [items]);

  const [address, setAddress] = useState<AddressInput>(EMPTY_ADDRESS);
  const [savedId, setSavedId] = useState<string | "new" | null>(null);
  const [shipping, setShipping] = useState<"standard" | "express">("standard");
  const [payment, setPayment] = useState<"razorpay" | "cod">("razorpay");
  const [codeInput, setCodeInput] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [giftInput, setGiftInput] = useState("");
  const [gift, setGift] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const config = useQuery({ queryKey: ["checkout-config"], queryFn: () => getCheckoutConfig() });
  const saved = useQuery({ queryKey: ["my-addresses", user?.id], enabled: !!user, queryFn: () => getMyAddresses() });
  const quote = useQuery({
    queryKey: ["quote", lines, code, gift, shipping, payment, user?.id],
    enabled: !!user && lines.length > 0,
    queryFn: () => quoteCheckout({ data: { lines, code, giftCard: gift, shipping, payment } }),
    retry: false,
  });

  // Default to the first saved address, or a blank form.
  useEffect(() => {
    if (savedId !== null || !saved.data) return;
    const first = saved.data[0];
    setSavedId(first ? first.id : "new");
  }, [saved.data, savedId]);
  useEffect(() => {
    if (config.data && !config.data.online && config.data.cod) setPayment("cod");
  }, [config.data]);
  // A rejected code is dropped so the order can still go through.
  useEffect(() => {
    if (!quote.data?.discountError) return;
    toast.error(quote.data.discountError);
    setCode(null);
  }, [quote.data?.discountError]);
  useEffect(() => {
    if (!quote.data?.giftCardError) return;
    toast.error(quote.data.giftCardError);
    setGift(null);
  }, [quote.data?.giftCardError]);

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <ShoppingBag className="h-10 w-10 text-muted-foreground" strokeWidth={1.2} />
        <h1 className="zk-display mt-4 text-3xl">Your bag is empty</h1>
        <Link to="/shop" search={{ q: undefined, category: undefined }} className="zk-label mt-6 inline-flex min-h-12 items-center rounded-full bg-foreground px-6 text-xs text-background">
          Shop the drop
        </Link>
      </div>
    );
  }

  const chosen = savedId && savedId !== "new" ? saved.data?.find((a) => a.id === savedId) : null;
  const finalAddress: AddressInput = chosen
    ? { full_name: chosen.full_name, phone: chosen.phone, address1: chosen.address1, address2: chosen.address2 ?? "", city: chosen.city, state: chosen.state, pincode: chosen.pincode, country: chosen.country }
    : address;
  const q = quote.data;
  const localSubtotal = items.reduce((s, i) => s + Number(i.price.amount) * i.quantity, 0);
  const cfg = config.data;
  const noPayment = cfg && !cfg.online && !cfg.cod;

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const res = await placeOrder({
        data: { lines, code, giftCard: gift, shipping, payment, address: finalAddress, note: note || null, affiliateCode: readReferral(), affiliateProducts: readReferralFull()?.products ?? [], affiliateReel: readReferralFull()?.reelId ?? null, saveAddress: !chosen },
      });
      if (res.kind === "done") {
        clearCart();
        navigate({ to: "/order-success", search: { order: res.orderNumber } });
        return;
      }
      if (!(await loadRazorpay()) || !window.Razorpay) throw new Error("Couldn't load the payment window. Check your connection and try again.");
      const rzp = new window.Razorpay({
        key: res.keyId,
        amount: res.amount,
        currency: "INR",
        name: "ZANKYO",
        description: `Order ${res.orderNumber}`,
        order_id: res.razorpayOrderId,
        prefill: { name: res.name, email: res.email, contact: res.phone },
        theme: { color: "#111111" },
        handler: async (r: RazorpayResponse) => {
          try {
            await confirmPayment({ data: { orderId: res.orderId, ...r } });
            clearCart();
            navigate({ to: "/order-success", search: { order: res.orderNumber } });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "We couldn't confirm the payment. If money was taken, contact help@zankyo.in.");
          }
        },
        modal: { ondismiss: () => { setBusy(false); toast("Payment cancelled — your bag is still here."); } },
      });
      rzp.on("payment.failed", () => toast.error("Payment failed. Please try again or use another method."));
      rzp.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't place the order");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:py-10">
      <h1 className="zk-display text-3xl sm:text-4xl">Checkout</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          {!user ? (
            <section className={box}>
              <h2 className={h2}>1. Sign in</h2>
              <p className="mt-2 text-sm text-muted-foreground">Sign in to place your order and track it later. It takes a few seconds.</p>
              <div className="mt-4">{!loading && <SignInPanel />}</div>
            </section>
          ) : (
            <form id="checkout-form" onSubmit={pay} className="space-y-5">
              <section className={box}>
                <h2 className={h2}>Contact</h2>
                <p className="mt-2 text-sm">{user.email}</p>
              </section>

              <section className={box}>
                <h2 className={h2}>Delivery address</h2>
                {(saved.data?.length ?? 0) > 0 && (
                  <div className="mt-3 space-y-2">
                    {saved.data!.map((a) => (
                      <label key={a.id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${savedId === a.id ? "border-foreground" : "border-border"}`}>
                        <input type="radio" name="addr" checked={savedId === a.id} onChange={() => setSavedId(a.id)} className="mt-1" />
                        <span><b>{a.full_name}</b> · {a.phone}<br /><span className="text-muted-foreground">{formatAddress({ ...a, address2: a.address2 ?? "" })}</span></span>
                      </label>
                    ))}
                    <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${savedId === "new" ? "border-foreground" : "border-border"}`}>
                      <input type="radio" name="addr" checked={savedId === "new"} onChange={() => setSavedId("new")} />
                      Use a new address
                    </label>
                  </div>
                )}
                {(savedId === "new" || !saved.data?.length) && (
                  <div className="mt-3"><AddressFields value={address} onChange={setAddress} /></div>
                )}
              </section>

              <section className={box}>
                <h2 className={h2}>Shipping</h2>
                <div className="mt-3 space-y-2">
                  {cfg && (
                    <Option checked={shipping === "standard"} onChange={() => setShipping("standard")} icon={<Truck className="h-4 w-4" />}
                      title={cfg.standard.label} right={q ? (q.shippingMethod === "standard" && q.shipping === 0 ? "Free" : formatMoney(cfg.standard.fee)) : formatMoney(cfg.standard.fee)}
                      sub={cfg.standard.freeOver > 0 ? `Free over ${formatMoney(cfg.standard.freeOver)}` : undefined} />
                  )}
                  {cfg?.express && (
                    <Option checked={shipping === "express"} onChange={() => setShipping("express")} icon={<Truck className="h-4 w-4" />} title={cfg.express.label} right={formatMoney(cfg.express.fee)} />
                  )}
                </div>
              </section>

              <section className={box}>
                <h2 className={h2}>Payment</h2>
                <div className="mt-3 space-y-2">
                  {cfg?.online && (
                    <Option checked={payment === "razorpay"} onChange={() => setPayment("razorpay")} icon={<CreditCard className="h-4 w-4" />} title="UPI, cards, netbanking" sub="Secure payment by Razorpay" />
                  )}
                  {cfg?.cod && (
                    <Option checked={payment === "cod"} onChange={() => setPayment("cod")} icon={<Wallet className="h-4 w-4" />} title="Cash on delivery" right={cfg.cod.fee > 0 ? `+${formatMoney(cfg.cod.fee)}` : undefined} />
                  )}
                  {noPayment && <p className="text-sm text-destructive">Payments are being set up. Please check back soon.</p>}
                </div>
              </section>

              <section className={box}>
                <h2 className={h2}>Note for us (optional)</h2>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="Gift message, delivery instructions…" className="mt-3 w-full rounded-lg border border-border bg-background p-3 text-base sm:text-sm" />
              </section>
            </form>
          )}
        </div>

        <aside className={`${box} h-fit space-y-4 lg:sticky lg:top-24`}>
          <h2 className={h2}>Order summary</h2>
          <ul className="space-y-3">
            {items.map((i) => (
              <li key={i.variantId} className="flex items-center gap-3 text-sm">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-card">
                  {i.product.node.images.edges[0] && <img src={i.product.node.images.edges[0].node.url} alt="" className="h-full w-full object-cover" />}
                  <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-foreground text-[10px] text-background">{i.quantity}</span>
                </div>
                <span className="min-w-0 flex-1"><span className="block truncate">{i.product.node.title}</span><span className="text-xs text-muted-foreground">{i.variantTitle}</span></span>
                <span>{formatMoney(Number(i.price.amount) * i.quantity)}</span>
              </li>
            ))}
          </ul>

          <CodeField label="Discount code" value={codeInput} onChange={setCodeInput} applied={q?.discountCode ?? null}
            onApply={() => setCode(codeInput.trim() || null)} onRemove={() => { setCode(null); setCodeInput(""); }} disabled={!user} />
          <CodeField label="Gift card" value={giftInput} onChange={setGiftInput} applied={q?.giftCardCode ?? null}
            onApply={() => setGift(giftInput.trim() || null)} onRemove={() => { setGift(null); setGiftInput(""); }} disabled={!user} />

          <dl className="space-y-1.5 border-t border-border pt-3 text-sm">
            <Row label="Subtotal" value={formatMoney(q?.subtotal ?? localSubtotal)} />
            {!!q?.discount && <Row label={`Discount (${q.discountCode})`} value={`−${formatMoney(q.discount)}`} />}
            <Row label="Shipping" value={q ? (q.shipping ? formatMoney(q.shipping) : "Free") : "—"} />
            {!!q?.codFee && <Row label="COD fee" value={formatMoney(q.codFee)} />}
            {!!q?.giftCardAmount && <Row label="Gift card" value={`−${formatMoney(q.giftCardAmount)}`} />}
            <div className="flex items-baseline justify-between border-t border-border pt-2">
              <dt className="zk-label text-xs">Total</dt>
              <dd className="text-xl font-bold">{q ? formatMoney(q.total) : "—"}</dd>
            </div>
          </dl>
          {quote.isError && <p className="text-sm text-destructive">{quote.error instanceof Error ? quote.error.message : "Couldn't price your bag"}</p>}

          <button
            type="submit"
            form="checkout-form"
            disabled={!user || busy || !q || quote.isFetching || !!noPayment || quote.isError}
            className="zk-label flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-xs text-background active:opacity-80 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {!user ? "Sign in to continue" : q?.total === 0 ? "Place order" : payment === "cod" ? "Place COD order" : `Pay ${q ? formatMoney(q.total) : ""}`}
          </button>
          <p className="text-center text-[11px] text-muted-foreground">
            By placing the order you agree to our <Link to="/terms" className="underline">terms</Link> and <Link to="/returns" className="underline">return policy</Link>.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Option({ checked, onChange, icon, title, sub, right }: { checked: boolean; onChange: () => void; icon: React.ReactNode; title: string; sub?: string | undefined; right?: string | undefined }) {
  return (
    <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${checked ? "border-foreground" : "border-border"}`}>
      <input type="radio" checked={checked} onChange={onChange} />
      <span className="text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1"><span className="block">{title}</span>{sub && <span className="block text-xs text-muted-foreground">{sub}</span>}</span>
      {right && <span className="font-semibold">{right}</span>}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><dt className="text-muted-foreground">{label}</dt><dd>{value}</dd></div>;
}

function CodeField({ label, value, onChange, applied, onApply, onRemove, disabled }: {
  label: string; value: string; onChange: (v: string) => void; applied: string | null; onApply: () => void; onRemove: () => void; disabled: boolean;
}) {
  if (applied) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
        <span>{label}: <b>{applied}</b></span>
        <button type="button" onClick={onRemove} className="min-h-9 text-xs underline">Remove</button>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <input value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} placeholder={label} aria-label={label} disabled={disabled}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onApply(); } }}
        className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-base uppercase sm:text-sm" />
      <button type="button" onClick={onApply} disabled={disabled || !value.trim()} className="zk-label min-h-11 rounded-lg border border-foreground px-4 text-[11px] disabled:opacity-40">Apply</button>
    </div>
  );
}
