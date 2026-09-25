import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, imageUrl } from "@/lib/catalog";
import { btn, btnGhost, Card, Field, inputCls, PageHeader } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/products")({ component: Products });

type VariantDraft = { id?: string; title: string; stock: number; sku: string };
type Draft = {
  id?: string; title: string; handle: string; description: string; category_id: string | null;
  price: string; compare_at_price: string; active: boolean; images: string[]; variants: VariantDraft[];
};
const blank: Draft = { title: "", handle: "", description: "", category_id: null, price: "", compare_at_price: "", active: true, images: [], variants: [{ title: "S", stock: 10, sku: "" }, { title: "M", stock: 10, sku: "" }, { title: "L", stock: 10, sku: "" }, { title: "XL", stock: 10, sku: "" }] };

const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function Products() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [search, setSearch] = useState("");
  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => (await supabase.from("products").select("*, categories(name), product_images(url, position), product_variants(id, title, stock, sku, position)").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: cats } = useQuery({ queryKey: ["admin-cats"], queryFn: async () => (await supabase.from("categories").select("id, name").order("position")).data ?? [] });

  const edit = (p: NonNullable<typeof products>[number]) => setDraft({
    id: p.id, title: p.title, handle: p.handle, description: p.description, category_id: p.category_id,
    price: String(p.price), compare_at_price: p.compare_at_price ? String(p.compare_at_price) : "", active: p.active,
    images: [...p.product_images].sort((a, b) => a.position - b.position).map((i) => i.url),
    variants: [...p.product_variants].sort((a, b) => a.position - b.position).map((v) => ({ id: v.id, title: v.title, stock: v.stock, sku: v.sku ?? "" })),
  });

  const filtered = (products ?? []).filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));

  if (draft) return <Editor draft={draft} setDraft={setDraft} cats={cats ?? []} onDone={() => { setDraft(null); qc.invalidateQueries(); }} />;

  return (
    <>
      <PageHeader title="Products" action={<button className={btn} onClick={() => setDraft(blank)}><Plus className="h-3 w-3" /> Add product</button>} />
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" className={`${inputCls} mb-4 max-w-sm`} />
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Stock</th><th className="p-3">Price</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const stock = p.product_variants.reduce((s, v) => s + v.stock, 0);
              const img = [...p.product_images].sort((a, b) => a.position - b.position)[0]?.url;
              return (
                <tr key={p.id} onClick={() => edit(p)} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="flex items-center gap-3 p-3">{img && <img src={imageUrl(img)} alt="" className="h-10 w-10 rounded object-cover" />}<span className="font-medium">{p.title}</span></td>
                  <td className="p-3 text-muted-foreground">{p.categories?.name ?? "—"}</td>
                  <td className={`p-3 ${stock === 0 ? "text-destructive" : ""}`}>{stock} in stock · {p.product_variants.length} sizes</td>
                  <td className="p-3">{formatMoney(p.price)}</td>
                  <td className="p-3 text-xs">{p.active ? "Active" : "Hidden"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function Editor({ draft, setDraft, cats, onDone }: { draft: Draft; setDraft: (d: Draft | null) => void; cats: Array<{ id: string; name: string }>; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<Draft>) => setDraft({ ...draft, ...p });

  const upload = async (files: FileList | null) => {
    if (!files) return;
    const urls: string[] = [];
    for (const f of Array.from(files)) {
      const path = `${crypto.randomUUID()}.${f.name.split(".").pop()?.toLowerCase() ?? "jpg"}`;
      const { error } = await supabase.storage.from("product-images").upload(path, f, { contentType: f.type });
      if (error) { toast.error(error.message); continue; }
      urls.push(`storage:${path}`);
    }
    set({ images: [...draft.images, ...urls] });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const row = {
        title: draft.title, handle: draft.handle || slug(draft.title), description: draft.description, category_id: draft.category_id,
        price: Number(draft.price), compare_at_price: draft.compare_at_price ? Number(draft.compare_at_price) : null, active: draft.active,
      };
      let id = draft.id;
      if (id) { const { error } = await supabase.from("products").update(row).eq("id", id); if (error) throw error; }
      else { const { data, error } = await supabase.from("products").insert(row).select("id").single(); if (error) throw error; id = data.id; }

      await supabase.from("product_images").delete().eq("product_id", id);
      if (draft.images.length) await supabase.from("product_images").insert(draft.images.map((url, i) => ({ product_id: id!, url, position: i, alt: draft.title })));

      const { data: existing } = await supabase.from("product_variants").select("id").eq("product_id", id);
      const keep = draft.variants.filter((v) => v.id).map((v) => v.id!);
      const removed = (existing ?? []).filter((v) => !keep.includes(v.id)).map((v) => v.id);
      if (removed.length) await supabase.from("product_variants").delete().in("id", removed);
      for (const [i, v] of draft.variants.entries()) {
        const vr = { product_id: id!, title: v.title, stock: Number(v.stock) || 0, sku: v.sku || null, position: i };
        const { error } = v.id ? await supabase.from("product_variants").update(vr).eq("id", v.id) : await supabase.from("product_variants").insert(vr);
        if (error) throw error;
      }
      toast.success("Product saved");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!draft.id || !confirm("Delete this product permanently?")) return;
    const { error } = await supabase.from("products").delete().eq("id", draft.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product deleted");
    onDone();
  };

  return (
    <form onSubmit={save}>
      <button type="button" onClick={() => setDraft(null)} className="mb-4 text-sm text-muted-foreground hover:text-foreground">← All products</button>
      <PageHeader title={draft.id ? "Edit product" : "New product"} action={
        <div className="flex gap-2">
          {draft.id && <button type="button" onClick={remove} className={`${btnGhost} text-destructive`}><Trash2 className="h-3 w-3" /> Delete</button>}
          <button disabled={busy} className={btn}>{busy ? "Saving…" : "Save"}</button>
        </div>
      } />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="space-y-3">
            <Field label="Title"><input required value={draft.title} onChange={(e) => set({ title: e.target.value, handle: draft.id ? draft.handle : slug(e.target.value) })} className={inputCls} /></Field>
            <Field label="Description"><textarea rows={5} value={draft.description} onChange={(e) => set({ description: e.target.value })} className={inputCls} /></Field>
            <Field label="URL handle"><input required value={draft.handle} onChange={(e) => set({ handle: slug(e.target.value) })} className={inputCls} /></Field>
          </Card>
          <Card>
            <h2 className="zk-label mb-3 text-xs">Photos</h2>
            <div className="flex flex-wrap gap-3">
              {draft.images.map((u, i) => (
                <div key={u} className="relative">
                  <img src={imageUrl(u)} alt="" className="h-24 w-24 rounded-lg object-cover" />
                  <button type="button" onClick={() => set({ images: draft.images.filter((x) => x !== u) })} className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-foreground text-background"><X className="h-3 w-3" /></button>
                  {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-background/80 px-1 text-[9px]">Main</span>}
                </div>
              ))}
              <label className="grid h-24 w-24 cursor-pointer place-items-center rounded-lg border border-dashed border-border text-muted-foreground hover:bg-muted">
                <Upload className="h-5 w-5" />
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
              </label>
            </div>
          </Card>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="zk-label text-xs">Sizes & stock</h2>
              <button type="button" className={btnGhost} onClick={() => set({ variants: [...draft.variants, { title: "", stock: 0, sku: "" }] })}><Plus className="h-3 w-3" /> Add size</button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_100px_1fr_32px] gap-2 text-xs text-muted-foreground"><span>Size</span><span>Stock</span><span>SKU</span><span /></div>
              {draft.variants.map((v, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_1fr_32px] gap-2">
                  <input required value={v.title} onChange={(e) => set({ variants: draft.variants.map((x, j) => j === i ? { ...x, title: e.target.value } : x) })} className={inputCls} />
                  <input type="number" min={0} value={v.stock} onChange={(e) => set({ variants: draft.variants.map((x, j) => j === i ? { ...x, stock: Number(e.target.value) } : x) })} className={inputCls} />
                  <input value={v.sku} onChange={(e) => set({ variants: draft.variants.map((x, j) => j === i ? { ...x, sku: e.target.value } : x) })} className={inputCls} />
                  <button type="button" onClick={() => set({ variants: draft.variants.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="space-y-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.active} onChange={(e) => set({ active: e.target.checked })} /> Visible in store</label>
            <Field label="Category">
              <select value={draft.category_id ?? ""} onChange={(e) => set({ category_id: e.target.value || null })} className={inputCls}>
                <option value="">— None —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </Card>
          <Card className="space-y-3">
            <Field label="Price (₹)"><input required type="number" min={0} step="1" value={draft.price} onChange={(e) => set({ price: e.target.value })} className={inputCls} /></Field>
            <Field label="MRP / compare-at price (₹, optional)"><input type="number" min={0} step="1" value={draft.compare_at_price} onChange={(e) => set({ compare_at_price: e.target.value })} className={inputCls} /></Field>
          </Card>
        </div>
      </div>
    </form>
  );
}
