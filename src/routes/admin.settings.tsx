import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addAdmin, listAdmins } from "@/lib/admin.functions";
import { btn, Card, Field, inputCls, PageHeader } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

function SettingsPage() {
  const qc = useQueryClient();
  const add = useServerFn(addAdmin);
  const list = useServerFn(listAdmins);
  const { data: s } = useQuery({ queryKey: ["admin-settings"], queryFn: async () => (await supabase.from("store_settings").select("*").eq("id", 1).single()).data });
  const { data: admins } = useQuery({ queryKey: ["admin-list"], queryFn: () => list() });
  const [f, setF] = useState<Record<string, string | boolean>>({});
  const [invite, setInvite] = useState("");
  useEffect(() => { if (s) setF(Object.fromEntries(Object.entries(s).map(([k, v]) => [k, typeof v === "boolean" ? v : String(v ?? "")]))); }, [s]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("store_settings").update({
      store_name: String(f["store_name"]), support_email: String(f["support_email"]),
      shipping_fee: Number(f["shipping_fee"]), free_shipping_over: Number(f["free_shipping_over"]),
      razorpay_enabled: !!f["razorpay_enabled"], pickup_location: String(f["pickup_location"]), package_weight_kg: Number(f["package_weight_kg"]),
    }).eq("id", 1);
    if (error) toast.error(error.message); else { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["admin-settings"] }); }
  };
  const text = (k: string, label: string, type = "text") => (
    <Field label={label}><input type={type} value={String(f[k] ?? "")} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={inputCls} /></Field>
  );

  return (
    <>
      <PageHeader title="Settings" />
      <form onSubmit={save} className="space-y-4">
        <Card className="grid gap-3 sm:grid-cols-2">
          <h2 className="zk-label text-xs sm:col-span-2">Store</h2>
          {text("store_name", "Store name")}
          {text("support_email", "Support email", "email")}
        </Card>
        <Card className="grid gap-3 sm:grid-cols-2">
          <h2 className="zk-label text-xs sm:col-span-2">Shipping</h2>
          {text("shipping_fee", "Shipping charge (₹)", "number")}
          {text("free_shipping_over", "Free shipping over (₹)", "number")}
          {text("pickup_location", "Shiprocket pickup location name")}
          {text("package_weight_kg", "Default package weight (kg)", "number")}
          <p className="text-xs text-muted-foreground sm:col-span-2">Shiprocket picks the courier (e.g. Delhivery) based on your Shiprocket courier priority settings.</p>
        </Card>
        <Card>
          <h2 className="zk-label mb-3 text-xs">Payments</h2>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f["razorpay_enabled"]} onChange={(e) => setF({ ...f, razorpay_enabled: e.target.checked })} /> Razorpay (UPI, cards, netbanking, wallets)</label>
          <p className="mt-2 text-xs text-muted-foreground">Webhook URL for Razorpay: <code>https://zankyo.in/api/public/razorpay-webhook</code> (events: payment.captured, order.paid)</p>
        </Card>
        <button className={btn}>Save settings</button>
      </form>

      <Card className="mt-6">
        <h2 className="zk-label mb-3 text-xs">Team admins</h2>
        <ul className="mb-3 space-y-1 text-sm">{admins?.map((a) => <li key={a.id}>{a.email}</li>)}</ul>
        <form onSubmit={async (e) => { e.preventDefault(); try { await add({ data: { email: invite } }); toast.success("Admin added — they'll get an email if they're new"); setInvite(""); qc.invalidateQueries({ queryKey: ["admin-list"] }); } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); } }} className="flex max-w-md gap-2">
          <input type="email" required value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="teammate@email.com" className={inputCls} />
          <button className={btn}>Add admin</button>
        </form>
      </Card>
    </>
  );
}
