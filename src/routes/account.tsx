import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCustomerStore } from "@/stores/customerStore";
import {
  addressCreate,
  addressDelete,
  addressUpdate,
  fetchCustomer,
  type AddressInput,
  type MailingAddress,
} from "@/lib/shopifyCustomer";
import { formatMoney } from "@/lib/shopify";

export const Route = createFileRoute("/account")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My account — ZANKYO" },
      { name: "description", content: "Your ZANKYO orders, saved addresses and profile." },
      { property: "og:title", content: "My account — ZANKYO" },
      { property: "og:description", content: "Your ZANKYO orders and addresses." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Account,
});

const EMPTY: AddressInput = {
  firstName: "", lastName: "", address1: "", address2: "", city: "", province: "", zip: "", country: "India", phone: "",
};
const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";

function Account() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const token = useCustomerStore((s) => s.validToken());
  const logout = useCustomerStore((s) => s.logout);
  const [editing, setEditing] = useState<{ id: string | null; data: AddressInput } | null>(null);

  useEffect(() => {
    if (!token) navigate({ to: "/auth", replace: true });
  }, [token, navigate]);

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", token],
    queryFn: () => fetchCustomer(token!),
    enabled: !!token,
  });

  if (!token) return null;
  if (isLoading) return <p className="py-20 text-center text-sm text-muted-foreground">Loading your account…</p>;
  if (!customer) {
    return (
      <div className="py-20 text-center text-sm">
        <p>Your session expired.</p>
        <button onClick={() => { logout(); navigate({ to: "/auth" }); }} className="mt-4 underline">Sign in again</button>
      </div>
    );
  }

  const refresh = () => qc.invalidateQueries({ queryKey: ["customer"] });

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      if (editing.id) await addressUpdate(token, editing.id, editing.data);
      else await addressCreate(token, editing.data);
      toast.success("Address saved");
      setEditing(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save address");
    }
  };

  const toInput = (a: MailingAddress): AddressInput => {
    const { id: _id, ...rest } = a;
    return Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v ?? ""])) as AddressInput;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="zk-label text-xs text-muted-foreground">My account</p>
          <h1 className="zk-display mt-1 text-4xl">Hi, {customer.firstName || "there"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{customer.email}</p>
        </div>
        <button
          onClick={async () => { await logout(); qc.removeQueries({ queryKey: ["customer"] }); navigate({ to: "/", replace: true }); }}
          className="zk-label rounded-full border border-border px-5 py-2 text-xs"
        >
          Sign out
        </button>
      </div>

      <section className="mt-10">
        <h2 className="zk-label text-sm">Orders</h2>
        {customer.orders.edges.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No orders yet. <Link to="/shop" className="underline">Start shopping</Link>
          </p>
        ) : (
          <div className="mt-3 divide-y divide-border rounded-xl border border-border">
            {customer.orders.edges.map(({ node: o }) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <div>
                  <p className="font-semibold">Order #{o.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.processedAt).toLocaleDateString("en-IN")} · {o.lineItems.edges.map((l) => `${l.node.title} ×${l.node.quantity}`).join(", ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatMoney(o.totalPrice.amount, o.totalPrice.currencyCode)}</p>
                  <p className="text-xs text-muted-foreground">
                    {(o.financialStatus ?? "").toLowerCase()} · {o.fulfillmentStatus.toLowerCase().replace(/_/g, " ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="zk-label text-sm">Addresses</h2>
          <button onClick={() => setEditing({ id: null, data: EMPTY })} className="text-sm underline">Add address</button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {customer.addresses.edges.map(({ node: a }) => (
            <div key={a.id} className="rounded-xl border border-border p-4 text-sm">
              {customer.defaultAddress?.id === a.id && <p className="zk-label mb-1 text-[10px] text-accent">Default</p>}
              <p className="font-medium">{a.firstName} {a.lastName}</p>
              <p className="text-muted-foreground">{[a.address1, a.address2, a.city, a.province, a.zip, a.country].filter(Boolean).join(", ")}</p>
              {a.phone && <p className="text-muted-foreground">{a.phone}</p>}
              <div className="mt-3 flex gap-4 text-xs">
                <button onClick={() => setEditing({ id: a.id, data: toInput(a) })} className="underline">Edit</button>
                <button
                  onClick={async () => {
                    try { await addressDelete(token, a.id); toast.success("Address removed"); refresh(); }
                    catch (err) { toast.error(err instanceof Error ? err.message : "Couldn't remove"); }
                  }}
                  className="text-destructive underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {customer.addresses.edges.length === 0 && !editing && (
            <p className="text-sm text-muted-foreground">No saved addresses. You can also add one during checkout.</p>
          )}
        </div>

        {editing && (
          <form onSubmit={saveAddress} className="mt-4 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
            {(
              [
                ["firstName", "First name"], ["lastName", "Last name"], ["address1", "Address"], ["address2", "Apartment, etc. (optional)"],
                ["city", "City"], ["province", "State"], ["zip", "PIN code"], ["country", "Country"], ["phone", "Phone"],
              ] as const
            ).map(([k, label]) => (
              <input
                key={k}
                required={k !== "address2" && k !== "phone"}
                placeholder={label}
                value={editing.data[k] ?? ""}
                onChange={(e) => setEditing({ ...editing, data: { ...editing.data, [k]: e.target.value } })}
                className={inputCls}
              />
            ))}
            <div className="flex gap-2 sm:col-span-2">
              <button className="zk-label rounded-full bg-foreground px-5 py-2 text-xs text-background">Save</button>
              <button type="button" onClick={() => setEditing(null)} className="zk-label rounded-full border border-border px-5 py-2 text-xs">Cancel</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
