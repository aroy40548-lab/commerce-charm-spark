import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney } from "@/lib/catalog";
import { AddressFields, EMPTY_ADDRESS, formatAddress, type AddressInput } from "@/components/AddressForm";

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

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting payment", paid: "Paid · preparing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled", refunded: "Refunded",
};

function Account() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, loading } = useAuth();
  const [editing, setEditing] = useState<{ id: string | null; data: AddressInput } | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { next: "/account" }, replace: true });
  }, [loading, user, navigate]);

  const { data } = useQuery({
    queryKey: ["account", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [p, o, a] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase.from("orders").select("*, order_items(title, variant_title, quantity)").eq("user_id", user!.id).neq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("addresses").select("*").eq("user_id", user!.id).order("created_at"),
      ]);
      return { profile: p.data, orders: o.data ?? [], addresses: a.data ?? [] };
    },
  });

  if (loading || !user) return null;
  if (!data) return <p className="py-20 text-center text-sm text-muted-foreground">Loading your account…</p>;

  const refresh = () => qc.invalidateQueries({ queryKey: ["account"] });

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const row = { ...editing.data, user_id: user.id };
    const { error } = editing.id
      ? await supabase.from("addresses").update(row).eq("id", editing.id)
      : await supabase.from("addresses").insert({ ...row, is_default: data.addresses.length === 0 });
    if (error) { toast.error(error.message); return; }
    toast.success("Address saved");
    setEditing(null);
    refresh();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="zk-label text-xs text-muted-foreground">My account</p>
          <h1 className="zk-display mt-1 text-4xl">Hi, {data.profile?.first_name || "there"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); qc.clear(); navigate({ to: "/", replace: true }); }}
          className="zk-label rounded-full border border-border px-5 py-2 text-xs"
        >
          Sign out
        </button>
      </div>

      <section className="mt-10">
        <h2 className="zk-label text-sm">My orders</h2>
        {data.orders.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No orders yet. <Link to="/shop" search={{ q: undefined, category: undefined }} className="underline">Start shopping</Link></p>
        ) : (
          <div className="mt-3 divide-y divide-border rounded-xl border border-border">
            {data.orders.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <div>
                  <p className="font-semibold">Order #{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("en-IN")} · {o.order_items.map((l) => `${l.title} (${l.variant_title}) ×${l.quantity}`).join(", ")}
                  </p>
                  {o.awb_code && <p className="text-xs text-muted-foreground">{o.courier_name ?? "Courier"} · AWB {o.awb_code} · {o.tracking_status}</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatMoney(o.total)}</p>
                  <p className="text-xs text-muted-foreground">{STATUS_LABEL[o.status] ?? o.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="zk-label text-sm">Addresses</h2>
          <button onClick={() => setEditing({ id: null, data: EMPTY_ADDRESS })} className="text-sm underline">Add address</button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {data.addresses.map((a) => (
            <div key={a.id} className="rounded-xl border border-border p-4 text-sm">
              {a.is_default && <p className="zk-label mb-1 text-[10px] text-accent">Default</p>}
              <p className="font-medium">{a.full_name}</p>
              <p className="text-muted-foreground">{formatAddress({ ...a, address2: a.address2 ?? "" })}</p>
              <p className="text-muted-foreground">{a.phone}</p>
              <div className="mt-3 flex gap-4 text-xs">
                <button onClick={() => setEditing({ id: a.id, data: { full_name: a.full_name, phone: a.phone, address1: a.address1, address2: a.address2 ?? "", city: a.city, state: a.state, pincode: a.pincode, country: a.country } })} className="underline">Edit</button>
                <button
                  onClick={async () => { await supabase.from("addresses").delete().eq("id", a.id); toast.success("Address removed"); refresh(); }}
                  className="text-destructive underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {data.addresses.length === 0 && !editing && <p className="text-sm text-muted-foreground">No saved addresses. You can also add one during checkout.</p>}
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
