import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { btn, Card, Field, inputCls, PageHeader } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/discounts")({ component: Discounts });

const blank = { code: "", kind: "percent", value: "", min_order: "0", expires_at: "", usage_limit: "" };

function Discounts() {
  const qc = useQueryClient();
  const [f, setF] = useState(blank);
  const { data } = useQuery({ queryKey: ["admin-discounts"], queryFn: async () => (await supabase.from("discounts").select("*").order("created_at", { ascending: false })).data ?? [] });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-discounts"] });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("discounts").insert({
      code: f.code.trim().toUpperCase(), kind: f.kind, value: Number(f.value), min_order: Number(f.min_order || 0),
      expires_at: f.expires_at ? new Date(f.expires_at).toISOString() : null, usage_limit: f.usage_limit ? Number(f.usage_limit) : null,
    });
    if (error) { toast.error(error.message); return; }
    setF(blank); refresh(); toast.success("Discount created");
  };

  return (
    <>
      <PageHeader title="Discounts" />
      <Card className="mb-6">
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Code"><input required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} className={inputCls} /></Field>
          <Field label="Type"><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className={inputCls}><option value="percent">% off</option><option value="flat">₹ off</option></select></Field>
          <Field label="Value"><input required type="number" min={1} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} className={inputCls} /></Field>
          <Field label="Min order ₹"><input type="number" min={0} value={f.min_order} onChange={(e) => setF({ ...f, min_order: e.target.value })} className={inputCls} /></Field>
          <Field label="Expires"><input type="date" value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} className={inputCls} /></Field>
          <Field label="Usage limit"><input type="number" min={1} value={f.usage_limit} onChange={(e) => setF({ ...f, usage_limit: e.target.value })} className={inputCls} /></Field>
          <div className="sm:col-span-3 lg:col-span-6"><button className={btn}>Create discount</button></div>
        </form>
      </Card>
      <Card className="divide-y divide-border p-0">
        {data?.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center gap-4 p-3 text-sm">
            <span className="w-32 font-mono font-semibold">{d.code}</span>
            <span>{d.kind === "percent" ? `${d.value}% off` : `₹${d.value} off`}</span>
            <span className="text-muted-foreground">min ₹{d.min_order}</span>
            <span className="text-muted-foreground">used {d.used_count}{d.usage_limit ? `/${d.usage_limit}` : ""}</span>
            <span className="text-muted-foreground">{d.expires_at ? `expires ${new Date(d.expires_at).toLocaleDateString("en-IN")}` : "no expiry"}</span>
            <label className="ml-auto flex items-center gap-2 text-xs"><input type="checkbox" checked={d.active} onChange={async (e) => { await supabase.from("discounts").update({ active: e.target.checked }).eq("id", d.id); refresh(); }} /> Active</label>
            <button onClick={async () => { if (confirm(`Delete ${d.code}?`)) { await supabase.from("discounts").delete().eq("id", d.id); refresh(); } }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </Card>
    </>
  );
}
