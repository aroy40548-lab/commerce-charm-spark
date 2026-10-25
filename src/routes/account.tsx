import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Heart, Loader2, LogOut, MapPin, Package, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { ZankyoStar } from "@/components/ZankyoStar";
import { SignInPanel } from "@/components/SignInPanel";
import { signOut, useAuth } from "@/hooks/useAuth";
import { deleteMyAddress, getMyAddresses, getMyOrders } from "@/lib/account.functions";
import { formatMoney } from "@/lib/catalog";

export const Route = createFileRoute("/account")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My account — ZANKYO" },
      { name: "description", content: "Your ZANKYO orders, tracking and saved items." },
      { property: "og:title", content: "My account — ZANKYO" },
      { property: "og:description", content: "Your ZANKYO orders and tracking." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Account,
});

type Order = Awaited<ReturnType<typeof getMyOrders>>[number];

const STATUS: Record<string, string> = {
  paid: "Confirmed", confirmed: "Confirmed (COD)", shipped: "In transit", delivered: "Delivered",
  cancelled: "Cancelled", refunded: "Refunded",
};

function Account() {
  const { user, name, loading } = useAuth();
  const [tab, setTab] = useState<"current" | "past" | "addresses">("current");
  const orders = useQuery({ queryKey: ["my-orders", user?.id], enabled: !!user, queryFn: () => getMyOrders() });

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10 sm:py-16">
        <div className="text-center">
          <ZankyoStar className="mx-auto h-8 w-8" />
          <h1 className="zk-display mt-4 text-3xl sm:text-4xl">My account</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Sign in to see your orders, tracking and saved items.</p>
        </div>
        <div className="mt-7"><SignInPanel /></div>
      </div>
    );
  }

  const list = orders.data ?? [];
  const current = list.filter((o) => ["paid", "confirmed", "shipped"].includes(o.status));
  const past = list.filter((o) => !["paid", "confirmed", "shipped"].includes(o.status));
  const shown = tab === "current" ? current : past;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6 sm:py-10">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-foreground text-sm font-semibold uppercase text-background">
            {(name || "U").charAt(0)}
          </span>
          <div className="min-w-0">
            <h1 className="zk-display truncate text-2xl leading-tight sm:text-3xl">Hi, {name.split(" ")[0] || "there"}</h1>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <button onClick={() => signOut()} aria-label="Sign out" className="zk-label flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border px-4 text-xs active:opacity-80">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </header>

      <Link to="/affiliate" className="mt-5 flex items-center gap-3 rounded-2xl bg-muted/70 px-4 py-3 text-sm active:opacity-80">
        <Gift className="h-5 w-5 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Earn with ZANKYO</span>
          <span className="block text-xs text-muted-foreground">Get your own link and earn commission on every order.</span>
        </span>
      </Link>

      <div className="mt-6 grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
        {(["current", "past", "addresses"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`zk-label min-h-10 rounded-full text-[11px] transition-colors ${tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            {t === "current" ? `Active (${current.length})` : t === "past" ? `Past (${past.length})` : "Addresses"}
          </button>
        ))}
      </div>

      {tab === "addresses" ? (
        <Addresses />
      ) : (
        <>
          {orders.isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading your orders…</p>}
          {orders.isError && <p className="mt-8 text-sm text-destructive">Couldn't load orders. Please refresh.</p>}
          {!orders.isLoading && !orders.isError && shown.length === 0 && (
            <div className="mt-10 rounded-2xl border border-dashed border-border px-5 py-10 text-center">
              <Package className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.4} />
              <p className="mt-3 text-sm text-muted-foreground">{tab === "current" ? "No orders on the way right now." : "No completed orders yet."}</p>
              <Link to="/shop" search={{ q: undefined, category: undefined }} className="zk-label mt-5 inline-flex min-h-11 items-center rounded-full bg-foreground px-6 text-xs text-background active:opacity-80">
                Explore new drops
              </Link>
            </div>
          )}
          <div className="mt-5 space-y-4">{shown.map((o) => <OrderCard key={o.id} order={o} />)}</div>
        </>
      )}

      <Link to="/shop" search={{ q: undefined, category: undefined }} className="mt-8 flex min-h-11 items-center justify-center gap-2 rounded-full border border-border text-sm active:opacity-80">
        <Heart className="h-4 w-4" /> Keep shopping
      </Link>
    </div>
  );
}

function OrderCard({ order: o }: { order: Order }) {
  const reviewable = ["paid", "confirmed", "shipped", "delivered"].includes(o.status);
  return (
    <article className="rounded-2xl border border-border p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">Order ZK{o.order_number}</p>
          <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-IN")}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold">{formatMoney(o.total)}</p>
          <p className="text-[11px] text-muted-foreground">{o.payment_method === "cod" ? "Cash on delivery" : "Paid online"}</p>
        </div>
      </div>
      <span className={`zk-label mt-3 inline-block rounded-full px-3 py-1 text-[10px] ${["delivered", "cancelled", "refunded"].includes(o.status) ? "bg-muted text-muted-foreground" : "bg-foreground text-background"}`}>
        {STATUS[o.status] ?? o.status}
      </span>
      {o.tracking_status && o.status === "shipped" && <p className="mt-2 text-xs text-muted-foreground">Latest: {o.tracking_status}</p>}

      <ul className="mt-3 space-y-2.5">
        {o.order_items.map((li, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            {li.image_url && <img src={li.image_url} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" loading="lazy" />}
            <span className="min-w-0 flex-1">
              <span className="block truncate">{li.title}</span>
              {li.variant_title && <span className="block text-xs text-muted-foreground">{li.variant_title}</span>}
            </span>
            <span className="shrink-0 text-muted-foreground">×{li.quantity}</span>
            {reviewable && li.handle && (
              <Link to="/product/$handle" params={{ handle: li.handle }} hash="reviews" className="shrink-0 text-xs underline underline-offset-2">Review</Link>
            )}
          </li>
        ))}
      </ul>

      {(o.tracking_url || o.awb_code) && (
        <div className="mt-4">
          {o.tracking_url ? (
            <a href={o.tracking_url} target="_blank" rel="noreferrer" className="zk-label flex min-h-11 items-center justify-center gap-2 rounded-full bg-foreground text-[11px] text-background active:opacity-80">
              <Truck className="h-4 w-4" /> Track {o.courier_name ?? "shipment"}
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">{o.courier_name} · Tracking no. {o.awb_code}</p>
          )}
        </div>
      )}
    </article>
  );
}

function Addresses() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["my-addresses"], queryFn: () => getMyAddresses() });
  const remove = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    await deleteMyAddress({ data: { id } });
    toast.success("Address deleted");
    qc.invalidateQueries({ queryKey: ["my-addresses"] });
  };
  if (q.isLoading) return <p className="mt-8 text-sm text-muted-foreground">Loading…</p>;
  if (!q.data?.length) return <p className="mt-8 text-sm text-muted-foreground">Addresses you use at checkout are saved here.</p>;
  return (
    <div className="mt-5 space-y-3">
      {q.data.map((a) => (
        <div key={a.id} className="flex gap-3 rounded-2xl border border-border p-4 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{a.full_name} {a.is_default && <span className="zk-label ml-1 rounded-full bg-muted px-2 py-0.5 text-[9px]">Default</span>}</p>
            <p className="text-muted-foreground">{[a.address1, a.address2, a.city, a.state, a.pincode].filter(Boolean).join(", ")}</p>
            <p className="text-muted-foreground">{a.phone}</p>
          </div>
          <button onClick={() => remove(a.id)} aria-label="Delete address" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground active:bg-muted">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
