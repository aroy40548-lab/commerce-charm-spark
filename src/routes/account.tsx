import { useState } from "react";
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Heart, LogOut, Package, Truck } from "lucide-react";
import { ZankyoStar } from "@/components/ZankyoStar";
import { signIn, useCustomerStore, useCustomerToken } from "@/stores/customerStore";
import { CUSTOMER_ORDERS_QUERY, customerQuery } from "@/lib/customerAccount";

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
  component: AccountLayout,
});

function AccountLayout() {
  const { pathname } = useLocation();
  if (pathname !== "/account") return <Outlet />;
  return <Account />;
}

const inr = (a: string, c: string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(Number(a));

const pretty = (s?: string | null) => (s ?? "").replace(/_/g, " ").toLowerCase();

function Account() {
  const token = useCustomerToken();
  const profile = useCustomerStore((s) => s.profile);
  const signOut = useCustomerStore((s) => s.signOut);
  const [tab, setTab] = useState<"current" | "past">("current");

  const orders = useQuery({
    queryKey: ["customer-orders", profile?.id],
    enabled: !!token,
    queryFn: async () => {
      const t = await useCustomerStore.getState().getAccessToken();
      if (!t) return [];
      const d = await customerQuery(t, CUSTOMER_ORDERS_QUERY);
      return (d.customer?.orders?.nodes ?? []) as any[];
    },
  });

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10 text-center sm:py-16">
        <ZankyoStar className="mx-auto h-8 w-8" />
        <h1 className="zk-display mt-4 text-3xl sm:text-4xl">My account</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Sign in with a one-time code sent to your email to see your orders, tracking and saved items.
        </p>
        <button
          onClick={() => signIn("/account")}
          className="zk-label mt-7 flex min-h-12 w-full items-center justify-center rounded-full bg-foreground text-xs text-background active:opacity-80"
        >
          Sign in to view orders
        </button>
        <Link to="/shop" search={{ q: undefined, category: undefined }} className="mt-4 text-sm underline underline-offset-4">
          Back to shop
        </Link>
      </div>
    );
  }

  const list = orders.data ?? [];
  const current = list.filter((o) => o.fulfillmentStatus !== "FULFILLED");
  const past = list.filter((o) => o.fulfillmentStatus === "FULFILLED");
  const shown = tab === "current" ? current : past;
  const initial = (profile?.firstName || profile?.email || "U").charAt(0).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6 sm:py-10">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-foreground text-sm font-semibold text-background">
            {initial}
          </span>
          <div className="min-w-0">
            <h1 className="zk-display truncate text-2xl leading-tight sm:text-3xl">
              Hi, {profile?.firstName || "there"}
            </h1>
            {profile?.email && <p className="truncate text-xs text-muted-foreground">{profile.email}</p>}
          </div>
        </div>
        <button
          onClick={signOut}
          aria-label="Sign out"
          className="zk-label flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border px-4 text-xs active:opacity-80"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {(["current", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`zk-label min-h-10 rounded-full text-[11px] transition-colors ${
              tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t === "current" ? `Active (${current.length})` : `Past (${past.length})`}
          </button>
        ))}
      </div>

      {orders.isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading your orders…</p>}
      {orders.isError && <p className="mt-8 text-sm text-destructive">Couldn't load orders. Please sign in again.</p>}

      {!orders.isLoading && !orders.isError && shown.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-border px-5 py-10 text-center">
          <Package className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.4} />
          <p className="mt-3 text-sm text-muted-foreground">
            {tab === "current" ? "No orders on the way right now." : "No completed orders yet."}
          </p>
          <Link
            to="/shop"
            search={{ q: undefined, category: undefined }}
            className="zk-label mt-5 inline-flex min-h-11 items-center rounded-full bg-foreground px-6 text-xs text-background active:opacity-80"
          >
            Explore new drops
          </Link>
        </div>
      )}

      <div className="mt-5 space-y-4">
        {shown.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
      </div>

      <Link
        to="/shop"
        search={{ q: undefined, category: undefined }}
        className="mt-8 flex min-h-11 items-center justify-center gap-2 rounded-full border border-border text-sm active:opacity-80"
      >
        <Heart className="h-4 w-4" /> Keep shopping
      </Link>
    </div>
  );
}

function OrderCard({ order: o }: { order: any }) {
  const tracking = (o.fulfillments?.nodes ?? []).flatMap((f: any) => f.trackingInformation ?? []);
  const delivered = o.fulfillmentStatus === "FULFILLED";
  return (
    <article className="rounded-2xl border border-border p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">Order {o.name}</p>
          <p className="text-xs text-muted-foreground">{new Date(o.processedAt).toLocaleDateString("en-IN")}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold">{inr(o.totalPrice.amount, o.totalPrice.currencyCode)}</p>
          <p className="text-[11px] capitalize text-muted-foreground">{pretty(o.financialStatus)}</p>
        </div>
      </div>

      <span
        className={`zk-label mt-3 inline-block rounded-full px-3 py-1 text-[10px] ${
          delivered ? "bg-muted text-muted-foreground" : "bg-foreground text-background"
        }`}
      >
        {delivered ? "Delivered" : tracking.length > 0 ? "In transit" : pretty(o.fulfillmentStatus) || "Processing"}
      </span>

      <ul className="mt-3 space-y-2.5">
        {o.lineItems.nodes.map((li: any, i: number) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            {li.image?.url && <img src={li.image.url} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" loading="lazy" />}
            <span className="min-w-0 flex-1">
              <span className="block truncate">{li.title}</span>
              {li.variantTitle && <span className="block text-xs text-muted-foreground">{li.variantTitle}</span>}
            </span>
            <span className="shrink-0 text-muted-foreground">×{li.quantity}</span>
            {delivered && (
              <Link
                to="/product/$handle"
                params={{ handle: String(li.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") }}
                hash="reviews"
                className="shrink-0 text-xs underline underline-offset-2"
              >
                Review
              </Link>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {tracking.map((t: any, i: number) =>
          t.url ? (
            <a
              key={i}
              href={t.url}
              target="_blank"
              rel="noreferrer"
              className="zk-label flex min-h-11 items-center justify-center gap-2 rounded-full bg-foreground text-[11px] text-background active:opacity-80"
            >
              <Truck className="h-4 w-4" /> Track {t.company ?? "shipment"}
            </a>
          ) : null,
        )}
        {o.statusPageUrl && (
          <a
            href={o.statusPageUrl}
            target="_blank"
            rel="noreferrer"
            className="zk-label flex min-h-11 items-center justify-center gap-2 rounded-full border border-border text-[11px] active:opacity-80"
          >
            <ExternalLink className="h-4 w-4" /> Order details
          </a>
        )}
      </div>
    </article>
  );
}
