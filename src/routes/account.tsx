import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatMoney } from "@/lib/catalog";
import {
  ADDRESS_CREATE, ADDRESS_DEFAULT, ADDRESS_DELETE, ADDRESS_UPDATE, CUSTOMER_QUERY, firstUserError, storefrontApiRequest,
} from "@/lib/shopify";
import { useCustomerStore, useCustomerToken } from "@/stores/customerStore";
import { AddressFields, EMPTY_ADDRESS, formatAddress, type AddressInput } from "@/components/AddressForm";

export const Route = createFileRoute("/account")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My account — ZANKYO" },
      { name: "description", content: "Your ZANKYO orders, tracking and saved addresses." },
      { property: "og:title", content: "My account — ZANKYO" },
      { property: "og:description", content: "Your ZANKYO orders and addresses." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Account,
});

type ShopAddress = { id: string; firstName: string | null; lastName: string | null; address1: string | null; address2: string | null; city: string | null; province: string | null; zip: string | null; country: string | null; phone: string | null };
type Order = {
  id: string; name: string; processedAt: string; financialStatus: string | null; fulfillmentStatus: string; canceledAt: string | null; statusUrl: string;
  currentTotalPrice: { amount: string; currencyCode: string };
  lineItems: { edges: Array<{ node: { title: string; quantity: number; variant: { title: string } | null } }> };
  successfulFulfillments: Array<{ trackingCompany: string | null; trackingInfo: Array<{ number: string | null; url: string | null }> }> | null;
};

const FULFILL: Record<string, string> = {
  UNFULFILLED: "Preparing", IN_PROGRESS: "Preparing", PARTIALLY_FULFILLED: "Partly shipped", FULFILLED: "Shipped",
  ON_HOLD: "On hold", SCHEDULED: "Scheduled", RESTOCKED: "Returned", PENDING_FULFILLMENT: "Preparing", OPEN: "Preparing",
};

const toInput = (a: ShopAddress): AddressInput => ({
  full_name: [a.firstName, a.lastName].filter(Boolean).join(" "), phone: a.phone ?? "", address1: a.address1 ?? "",
  address2: a.address2 ?? "", city: a.city ?? "", state: a.province ?? "", pincode: a.zip ?? "", country: a.country ?? "India",
});
const toShopify = (a: AddressInput) => {
  const [firstName, ...rest] = a.full_name.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") || "-", phone: a.phone.startsWith("+") ? a.phone : `+91${a.phone}`, address1: a.address1, address2: a.address2, city: a.city, province: a.state, zip: a.pincode, country: a.country || "India" };
};

function Account() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const token = useCustomerToken();
  const logout = useCustomerStore((s) => s.logout);
  const [editing, setEditing] = useState<{ id: string | null; data: AddressInput } | null>(null);

  useEffect(() => {
    if (!token) navigate({ to: "/auth", search: { next: "/account" }, replace: true });
  }, [token, navigate]);

  const { data, error } = useQuery({
    queryKey: ["shopify-customer", token],
    enabled: !!token,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await storefrontApiRequest(CUSTOMER_QUERY, { token });
      const c = res?.data?.customer;
      if (!c) throw new Error("Your session expired. Please sign in again.");
      return c as {
        firstName: string | null; lastName: string | null; email: string; defaultAddress: { id: string } | null;
        addresses: { edges: Array<{ node: ShopAddress }> }; orders: { edges: Array<{ node: Order }> };
      };
    },
  });

  if (!token) return null;
  if (error) return (
    <div className="py-20 text-center text-sm">
      <p className="text-muted-foreground">{error.message}</p>
      <button onClick={async () => { await logout(); }} className="mt-4 underline">Sign in again</button>
    </div>
  );
  if (!data) return <p className="py-20 text-center text-sm text-muted-foreground">Loading your account…</p>;

  const refresh = () => qc.invalidateQueries({ queryKey: ["shopify-customer"] });
  const orders = data.orders.edges.map((e) => e.node);
  const current = orders.filter((o) => !o.canceledAt && o.fulfillmentStatus !== "FULFILLED");
  const past = orders.filter((o) => o.canceledAt || o.fulfillmentStatus === "FULFILLED");

  const run = async (query: string, vars: Record<string, unknown>, key: string, ok: string) => {
    try {
      const res = await storefrontApiRequest(query, { token, ...vars });
      const err = firstUserError(res?.data?.[key]?.customerUserErrors);
      if (err) { toast.error(err); return false; }
      toast.success(ok);
      refresh();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      return false;
    }
  };

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const address = toShopify(editing.data);
    const ok = editing.id
      ? await run(ADDRESS_UPDATE, { id: editing.id, address }, "customerAddressUpdate", "Address saved")
      : await run(ADDRESS_CREATE, { address }, "customerAddressCreate", "Address saved");
    if (ok) setEditing(null);
  };

  const OrderList = ({ list, empty }: { list: Order[]; empty: React.ReactNode }) =>
    list.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{empty}</p> : (
      <div className="mt-3 divide-y divide-border rounded-xl border border-border">
        {list.map((o) => {
          const tracking = (o.successfulFulfillments ?? []).flatMap((f) => f.trackingInfo.map((t) => ({ ...t, company: f.trackingCompany })));
          return (
            <div key={o.id} className="flex flex-wrap items-start justify-between gap-2 p-4 text-sm">
              <div className="min-w-0">
                <p className="font-semibold">Order {o.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(o.processedAt).toLocaleDateString("en-IN")} · {o.lineItems.edges.map(({ node: l }) => `${l.title}${l.variant ? ` (${l.variant.title})` : ""} ×${l.quantity}`).join(", ")}
                </p>
                {tracking.map((t, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {t.company ?? "Courier"}{t.number ? ` · ${t.number}` : ""}{" "}
                    {t.url && <a href={t.url} target="_blank" rel="noreferrer" className="underline">Track package</a>}
                  </p>
                ))}
                <a href={o.statusUrl} target="_blank" rel="noreferrer" className="text-xs underline">Order details</a>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatMoney(o.currentTotalPrice.amount, o.currentTotalPrice.currencyCode)}</p>
                <p className="text-xs text-muted-foreground">{o.canceledAt ? "Cancelled" : FULFILL[o.fulfillmentStatus] ?? o.fulfillmentStatus}</p>
              </div>
            </div>
          );
        })}
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="zk-label text-xs text-muted-foreground">My account</p>
          <h1 className="zk-display mt-1 text-4xl">Hi, {data.firstName || "there"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.email}</p>
        </div>
        <button onClick={async () => { await logout(); qc.clear(); navigate({ to: "/", replace: true }); }} className="zk-label rounded-full border border-border px-5 py-2 text-xs">
          Sign out
        </button>
      </div>

      <section className="mt-10">
        <h2 className="zk-label text-sm">Current orders</h2>
        <OrderList list={current} empty={<>No orders in progress. <Link to="/shop" search={{ q: undefined, category: undefined }} className="underline">Start shopping</Link></>} />
      </section>

      <section className="mt-10">
        <h2 className="zk-label text-sm">Order history</h2>
        <OrderList list={past} empty="No past orders yet." />
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="zk-label text-sm">Addresses</h2>
          <button onClick={() => setEditing({ id: null, data: EMPTY_ADDRESS })} className="text-sm underline">Add address</button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {data.addresses.edges.map(({ node: a }) => {
            const isDefault = data.defaultAddress?.id === a.id;
            const input = toInput(a);
            return (
              <div key={a.id} className="rounded-xl border border-border p-4 text-sm">
                {isDefault && <p className="zk-label mb-1 text-[10px] text-accent">Default</p>}
                <p className="font-medium">{input.full_name}</p>
                <p className="text-muted-foreground">{formatAddress(input)}</p>
                <p className="text-muted-foreground">{a.phone}</p>
                <div className="mt-3 flex gap-4 text-xs">
                  <button onClick={() => setEditing({ id: a.id, data: { ...input, phone: input.phone.replace(/^\+91/, "") } })} className="underline">Edit</button>
                  {!isDefault && <button onClick={() => run(ADDRESS_DEFAULT, { id: a.id }, "customerDefaultAddressUpdate", "Default address updated")} className="underline">Make default</button>}
                  <button onClick={() => run(ADDRESS_DELETE, { id: a.id }, "customerAddressDelete", "Address removed")} className="text-destructive underline">Delete</button>
                </div>
              </div>
            );
          })}
          {data.addresses.edges.length === 0 && !editing && <p className="text-sm text-muted-foreground">No saved addresses. You can also add one at checkout.</p>}
        </div>

        {editing && (
          <form onSubmit={saveAddress} className="mt-4 space-y-3 rounded-xl border border-border p-4">
            <AddressFields value={editing.data} onChange={(d) => setEditing({ ...editing, data: d })} />
            <div className="flex gap-2">
              <button className="zk-label rounded-full bg-foreground px-5 py-2 text-xs text-background">Save</button>
              <button type="button" onClick={() => setEditing(null)} className="zk-label rounded-full border border-border px-5 py-2 text-xs">Cancel</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
