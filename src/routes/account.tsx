import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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

function Account() {
  const token = useCustomerToken();
  const profile = useCustomerStore((s) => s.profile);
  const signOut = useCustomerStore((s) => s.signOut);

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
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 text-center">
        <ZankyoStar className="mx-auto h-8 w-8" />
        <h1 className="zk-display mt-4 text-4xl">My account</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in with a one-time code sent to your email to see your orders and tracking.</p>
        <button onClick={() => signIn("/account")} className="zk-label mt-8 w-full rounded-full bg-foreground py-3 text-xs text-background">
          Sign in to view orders
        </button>
      </div>
    );
  }

  const list = orders.data ?? [];
  const current = list.filter((o) => o.fulfillmentStatus !== "FULFILLED");
  const past = list.filter((o) => o.fulfillmentStatus === "FULFILLED");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="zk-label text-xs text-muted-foreground">My account</p>
          <h1 className="zk-display mt-1 text-3xl sm:text-4xl">Hi, {profile?.firstName || profile?.email || "there"}</h1>
          {profile?.email && <p className="mt-1 text-sm text-muted-foreground break-all">{profile.email}</p>}
        </div>
        <button onClick={signOut} className="zk-label rounded-full border border-border px-5 py-2.5 text-xs">Sign out</button>
      </div>

      {orders.isLoading && <p className="mt-10 text-sm text-muted-foreground">Loading your orders…</p>}
      {orders.isError && <p className="mt-10 text-sm text-destructive">Couldn't load orders. Please sign in again.</p>}
      {!orders.isLoading && !orders.isError && list.length === 0 && (
        <p className="mt-10 text-sm text-muted-foreground">
          No orders yet. <Link to="/shop" search={{ q: undefined, category: undefined }} className="underline">Start shopping</Link>.
        </p>
      )}
      {current.length > 0 && <OrderSection title="Current orders" orders={current} />}
      {past.length > 0 && <OrderSection title="Order history" orders={past} />}
    </div>
  );
}

function OrderSection({ title, orders }: { title: string; orders: any[] }) {
  return (
    <section className="mt-10">
      <h2 className="zk-label text-xs text-muted-foreground">{title}</h2>
      <div className="mt-3 space-y-4">
        {orders.map((o) => {
          const tracking = (o.fulfillments?.nodes ?? []).flatMap((f: any) => f.trackingInformation ?? []);
          return (
            <div key={o.id} className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">Order {o.name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.processedAt).toLocaleDateString("en-IN")}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{inr(o.totalPrice.amount, o.totalPrice.currencyCode)}</p>
                  <p className="text-xs text-muted-foreground">
                    {(o.financialStatus ?? "").replace(/_/g, " ").toLowerCase()} · {(o.fulfillmentStatus ?? "unfulfilled").replace(/_/g, " ").toLowerCase()}
                  </p>
                </div>
              </div>
              <ul className="mt-3 space-y-2">
                {o.lineItems.nodes.map((li: any, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    {li.image?.url && <img src={li.image.url} alt="" className="h-12 w-12 rounded-md object-cover" loading="lazy" />}
                    <span className="min-w-0 flex-1 truncate">{li.title}{li.variantTitle ? ` — ${li.variantTitle}` : ""}</span>
                    <span className="text-muted-foreground">×{li.quantity}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {tracking.map((t: any, i: number) =>
                  t.url ? <a key={i} href={t.url} target="_blank" rel="noreferrer" className="underline">Track {t.company ?? "shipment"}</a> : null,
                )}
                {o.statusPageUrl && <a href={o.statusPageUrl} target="_blank" rel="noreferrer" className="underline">Order details</a>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
