import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { adminDeleteCollection, adminListCollections, adminReorderCollections, adminSaveCollection, adminUpload } from "@/lib/admin/products.functions";
import { Card, Empty, Field, PageHeader, ReadOnlyNote, Spinner, btn, btnGhost, fileToBase64, inputCls, useAction, useCanEdit } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/collections")({ component: Collections });

type Edit = { id?: string; name: string; description: string; image_url: string | null };

function Collections() {
  const q = useQuery({ queryKey: ["admin-collections"], queryFn: () => adminListCollections() });
  const canEdit = useCanEdit("products");
  const { busy, run } = useAction();
  const [edit, setEdit] = useState<Edit | null>(null);
  const inv = ["admin-collections", "categories"];
  const list = q.data ?? [];

  const move = (i: number, d: number) => {
    const ids = list.map((c) => c.id);
    const [x] = ids.splice(i, 1);
    ids.splice(i + d, 0, x!);
    void run("order", () => adminReorderCollections({ data: { ids } }), undefined, inv);
  };

  return (
    <div>
      <PageHeader title="Collections" subtitle="The categories shown on the store. Order here = order on the site." action={canEdit && <button onClick={() => setEdit({ name: "", description: "", image_url: null })} className={btn}><Plus className="h-4 w-4" /> Create collection</button>} />
      <ReadOnlyNote section="products" />
      {edit && <CollectionForm value={edit} onClose={() => setEdit(null)} onSave={async (v) => { if (await run("save", () => adminSaveCollection({ data: v }), "Collection saved", inv)) setEdit(null); }} busy={busy === "save"} />}
      {q.isLoading ? <Spinner /> : !list.length ? <Empty>No collections yet.</Empty> : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
          {list.map((c, i) => (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              {c.image_url ? <img src={c.image_url} alt="" className="h-11 w-11 rounded-md object-cover" /> : <div className="h-11 w-11 rounded-md bg-muted" />}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.name}</p>
                <Link to="/shop" search={{ q: undefined, category: c.name }} target="_blank" className="text-xs text-muted-foreground underline">{c.productCount} product{c.productCount === 1 ? "" : "s"}</Link>
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <button disabled={i === 0 || !!busy} onClick={() => move(i, -1)} aria-label="Move up" className="grid h-9 w-9 place-items-center rounded-lg border border-border disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button disabled={i === list.length - 1 || !!busy} onClick={() => move(i, 1)} aria-label="Move down" className="grid h-9 w-9 place-items-center rounded-lg border border-border disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                  <button onClick={() => setEdit({ id: c.id, name: c.name, description: c.description, image_url: c.image_url })} aria-label="Edit" className="grid h-9 w-9 place-items-center rounded-lg border border-border"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { if (confirm(`Delete "${c.name}"? Its products stay, just without a collection.`)) void run("del", () => adminDeleteCollection({ data: { id: c.id } }), "Deleted", inv); }} aria-label="Delete" className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CollectionForm({ value, onSave, onClose, busy }: { value: Edit; onSave: (v: Edit) => void; onClose: () => void; busy: boolean }) {
  const [v, setV] = useState(value);
  const [uploading, setUploading] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const r = await adminUpload({ data: { folder: "collections", file: { type: file.type, base64: await fileToBase64(file), name: file.name } } });
      setV((x) => ({ ...x, image_url: r.url }));
    } finally {
      setUploading(false);
    }
  };
  return (
    <Card className="mb-4" title={v.id ? "Edit collection" : "New collection"}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(v); }} className="grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)]">
        <label className="grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed border-border text-muted-foreground">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : v.image_url ? <img src={v.image_url} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5" />}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
        </label>
        <div className="space-y-3">
          <Field label="Name"><input required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={inputCls} /></Field>
          <Field label="Description"><textarea value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} rows={2} className={inputCls} /></Field>
          <div className="flex gap-2">
            <button disabled={busy || uploading} className={btn}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save</button>
            <button type="button" onClick={onClose} className={btnGhost}>Cancel</button>
          </div>
        </div>
      </form>
    </Card>
  );
}
