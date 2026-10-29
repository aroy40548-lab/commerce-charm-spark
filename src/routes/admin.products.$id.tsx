import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Copy, ExternalLink, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  adminDeleteProduct, adminDuplicateProduct, adminGetProduct, adminListCollections, adminSaveProduct, adminUpload,
} from "@/lib/admin/products.functions";
import { ProductExtras } from "@/components/admin/ProductExtras";
import { Card, Field, PageHeader, ReadOnlyNote, Spinner, btn, btnDanger, btnGhost, fileToBase64, inputCls, useAction, useCanEdit } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/products/$id")({ component: ProductPage });

type Variant = { id?: string; title: string; sku: string; price: string; compare_at_price: string; stock: number };
type Form = {
  title: string; handle: string; description: string; status: "active" | "draft" | "archived"; category_id: string | null;
  product_type: string; tags: string; price: string; compare_at_price: string; option_name: string;
  seo_title: string; seo_description: string; images: Array<{ url: string; alt: string }>; variants: Variant[];
};

const BLANK: Form = {
  title: "", handle: "", description: "", status: "draft", category_id: null, product_type: "", tags: "", price: "", compare_at_price: "",
  option_name: "Size", seo_title: "", seo_description: "", images: [],
  variants: ["S", "M", "L", "XL"].map((t) => ({ title: t, sku: "", price: "", compare_at_price: "", stock: 0 })),
};

function ProductPage() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const canEdit = useCanEdit("products");
  const { busy, run } = useAction();
  const product = useQuery({ queryKey: ["admin-product", id], enabled: !isNew, queryFn: () => adminGetProduct({ data: { id } }) });
  const collections = useQuery({ queryKey: ["admin-collections"], queryFn: () => adminListCollections() });
  const [f, setF] = useState<Form | null>(isNew ? BLANK : null);
  const [uploading, setUploading] = useState(0);

  useEffect(() => {
    const p = product.data;
    if (!p) return;
    const s = (n: number | null) => (n == null ? "" : String(n));
    setF({
      title: p.title, handle: p.handle, description: p.description, status: p.status as Form["status"], category_id: p.category_id,
      product_type: p.product_type, tags: p.tags.join(", "), price: s(p.price), compare_at_price: s(p.compare_at_price), option_name: p.option_name,
      seo_title: p.seo_title ?? "", seo_description: p.seo_description ?? "",
      images: p.product_images.map((i) => ({ url: i.url, alt: i.alt ?? "" })),
      variants: p.product_variants.map((v) => ({ id: v.id, title: v.title, sku: v.sku ?? "", price: s(v.price), compare_at_price: s(v.compare_at_price), stock: v.stock })),
    });
  }, [product.data]);

  if (!f) return <Spinner />;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF({ ...f, [k]: v });
  const setVariant = (i: number, patch: Partial<Variant>) => set("variants", f.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const num = (s: string) => (s.trim() === "" ? null : Number(s));

  const upload = async (files: FileList | null) => {
    const list = Array.from(files ?? []);
    setUploading(list.length);
    const added: Array<{ url: string; alt: string }> = [];
    for (const file of list) {
      try {
        if (!file.type.startsWith("image/")) throw new Error(`${file.name} isn't an image`);
        const res = await adminUpload({ data: { folder: "products", file: { type: file.type, base64: await fileToBase64(file), name: file.name } } });
        added.push({ url: res.url, alt: f.title });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      }
      setUploading((n) => n - 1);
    }
    setF((cur) => (cur ? { ...cur, images: [...cur.images, ...added] } : cur));
  };

  const move = (i: number, d: number) => {
    const imgs = [...f.images];
    const [x] = imgs.splice(i, 1);
    imgs.splice(i + d, 0, x!);
    set("images", imgs);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await run("save", () => adminSaveProduct({
      data: {
        ...(isNew ? {} : { id }),
        title: f.title, handle: f.handle, description: f.description, status: f.status, category_id: f.category_id,
        product_type: f.product_type, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
        price: Number(f.price || 0), compare_at_price: num(f.compare_at_price), option_name: f.option_name,
        seo_title: f.seo_title || null, seo_description: f.seo_description || null,
        images: f.images.map((i) => ({ url: i.url, alt: i.alt || null })),
        variants: f.variants.map((v) => ({ ...(v.id ? { id: v.id } : {}), title: v.title, sku: v.sku || null, price: num(v.price), compare_at_price: num(v.compare_at_price), stock: Number(v.stock) || 0 })),
      },
    }), "Product saved", ["admin-products", "admin-product", "products", "product", "categories"]);
    if (res && isNew) navigate({ to: "/admin/products/$id", params: { id: res.id }, replace: true });
  };

  return (
    <form onSubmit={save}>
      <PageHeader
        back="/admin/products"
        title={isNew ? "Add product" : f.title || "Product"}
        action={
          <>
            {!isNew && f.status === "active" && <a href={`/product/${f.handle}`} target="_blank" rel="noreferrer" className={btnGhost}><ExternalLink className="h-4 w-4" /> View</a>}
            {!isNew && canEdit && (
              <button type="button" disabled={!!busy} className={btnGhost} onClick={async () => {
                const r = await run("dup", () => adminDuplicateProduct({ data: { id } }), "Duplicated as a draft", ["admin-products"]);
                if (r) navigate({ to: "/admin/products/$id", params: { id: r.id } });
              }}><Copy className="h-4 w-4" /> Duplicate</button>
            )}
            {canEdit && <button disabled={!!busy || uploading > 0} className={btn}>{busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />} Save</button>}
          </>
        }
      />
      <ReadOnlyNote section="products" />
      <fieldset disabled={!canEdit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <Card>
            <div className="space-y-3">
              <Field label="Title"><input required value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Chaos Skull Tee" className={inputCls} /></Field>
              <Field label="Description"><textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={6} className={inputCls} /></Field>
            </div>
          </Card>

          <Card title="Photos" action={uploading > 0 && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Uploading {uploading}…</span>}>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {f.images.map((img, i) => (
                <div key={img.url + i} className={`group relative overflow-hidden rounded-lg border border-border bg-card ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
                  <img src={img.url} alt="" className="aspect-square w-full object-contain" />
                  {canEdit && (
                    <div className="absolute inset-x-1 bottom-1 flex justify-center gap-1">
                      {i > 0 && <button type="button" onClick={() => move(i, -1)} aria-label="Move earlier" className="grid h-7 w-7 place-items-center rounded bg-background/90"><ArrowUp className="h-3.5 w-3.5 -rotate-90" /></button>}
                      {i < f.images.length - 1 && <button type="button" onClick={() => move(i, 1)} aria-label="Move later" className="grid h-7 w-7 place-items-center rounded bg-background/90"><ArrowDown className="h-3.5 w-3.5 -rotate-90" /></button>}
                      <button type="button" onClick={() => set("images", f.images.filter((_, j) => j !== i))} aria-label="Remove photo" className="grid h-7 w-7 place-items-center rounded bg-background/90 text-destructive"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </div>
              ))}
              {canEdit && (
                <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border border-dashed border-border text-muted-foreground hover:bg-muted/50">
                  <span className="flex flex-col items-center gap-1 text-xs"><ImagePlus className="h-5 w-5" /> Add photos</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
                </label>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">The first photo is the main one. Use the arrows to reorder.</p>
          </Card>

          <Card title="Pricing">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Price (₹)"><input required type="number" min={0} step="1" value={f.price} onChange={(e) => set("price", e.target.value)} className={inputCls} /></Field>
              <Field label="Compare-at price (₹)" hint="Shown crossed out, e.g. MRP"><input type="number" min={0} step="1" value={f.compare_at_price} onChange={(e) => set("compare_at_price", e.target.value)} className={inputCls} /></Field>
            </div>
          </Card>

          <Card title="Variants & stock">
            <div className="sm:w-48"><Field label="Option name"><input value={f.option_name} onChange={(e) => set("option_name", e.target.value)} className={inputCls} /></Field></div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr><th className="pb-2 pr-2">{f.option_name || "Option"}</th><th className="pb-2 pr-2">Stock</th><th className="pb-2 pr-2">Price override</th><th className="pb-2 pr-2">SKU</th><th /></tr>
                </thead>
                <tbody>
                  {f.variants.map((v, i) => (
                    <tr key={v.id ?? i}>
                      <td className="py-1 pr-2"><input required value={v.title} onChange={(e) => setVariant(i, { title: e.target.value })} className={inputCls} /></td>
                      <td className="py-1 pr-2"><input type="number" min={0} value={v.stock} onChange={(e) => setVariant(i, { stock: Number(e.target.value) })} className={`${inputCls} w-24`} /></td>
                      <td className="py-1 pr-2"><input type="number" min={0} value={v.price} placeholder={f.price || "—"} onChange={(e) => setVariant(i, { price: e.target.value })} className={`${inputCls} w-28`} /></td>
                      <td className="py-1 pr-2"><input value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} className={inputCls} /></td>
                      <td className="py-1">{f.variants.length > 1 && <button type="button" onClick={() => set("variants", f.variants.filter((_, j) => j !== i))} aria-label="Remove variant" className="grid h-9 w-9 place-items-center text-muted-foreground"><Trash2 className="h-4 w-4" /></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {canEdit && <button type="button" onClick={() => set("variants", [...f.variants, { title: "", sku: "", price: "", compare_at_price: "", stock: 0 }])} className={`${btnGhost} mt-2`}><Plus className="h-4 w-4" /> Add variant</button>}
          </Card>

          {!isNew && product.data && (
            <ProductExtras id={id} canEdit={canEdit} sizes={f.variants.map((v) => v.title)}
              initialChart={(product.data as { size_chart?: unknown }).size_chart ?? null}
              initialPaired={(product.data as { paired_product_ids?: string[] }).paired_product_ids ?? []} />
          )}
          <Card title="Search engine listing">
            <div className="space-y-3">
              <Field label="URL handle" hint={`zankyo.in/product/${f.handle || "(from title)"}`}><input value={f.handle} onChange={(e) => set("handle", e.target.value)} className={inputCls} /></Field>
              <Field label="Page title"><input value={f.seo_title} onChange={(e) => set("seo_title", e.target.value)} placeholder={f.title} className={inputCls} /></Field>
              <Field label="Meta description"><textarea value={f.seo_description} onChange={(e) => set("seo_description", e.target.value)} rows={2} className={inputCls} /></Field>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Status">
            <select value={f.status} onChange={(e) => set("status", e.target.value as Form["status"])} className={inputCls}>
              <option value="active">Active (visible in store)</option>
              <option value="draft">Draft (hidden)</option>
              <option value="archived">Archived</option>
            </select>
          </Card>
          <Card title="Organisation">
            <div className="space-y-3">
              <Field label="Collection">
                <select value={f.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null)} className={inputCls}>
                  <option value="">None</option>
                  {collections.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Product type"><input value={f.product_type} onChange={(e) => set("product_type", e.target.value)} placeholder="T-shirt" className={inputCls} /></Field>
              <Field label="Tags" hint="Comma separated"><input value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="y2k, oversized" className={inputCls} /></Field>
            </div>
          </Card>
          {!isNew && canEdit && (
            <button type="button" disabled={!!busy} className={`${btnDanger} w-full`} onClick={async () => {
              if (!confirm("Delete this product for good? Past orders keep their details. Tip: Archive instead to hide it.")) return;
              if (await run("del", () => adminDeleteProduct({ data: { id } }), "Product deleted", ["admin-products"])) navigate({ to: "/admin/products" });
            }}><Trash2 className="h-4 w-4" /> Delete product</button>
          )}
        </div>
      </fieldset>
    </form>
  );
}
