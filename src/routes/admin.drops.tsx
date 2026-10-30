import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminDeleteDrop, adminListDrops, adminSaveDrop } from "@/lib/drops.functions";
import { adminUpload } from "@/lib/admin/products.functions";
import { Card, Empty, Field, PageHeader, Spinner, Toggle, btn, btnGhost, dateTime, fileToBase64, inputCls, useCanEdit } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/drops")({ component: AdminDrops });

type Edit = { id?: string; title: string; description: string; image_url: string | null; product_handle: string; drop_at: string; whatsapp_url: string; active: boolean };
const toLocal = (iso: string) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };

function AdminDrops() {
  const can = useCanEdit("products");
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-drops"], queryFn: () => adminListDrops() });
  const [edit, setEdit] = useState<Edit | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-drops"] }); qc.invalidateQueries({ queryKey: ["drops"] }); };

  const save = async (v: Edit) => {
    setBusy(true);
    try {
      await adminSaveDrop({ data: {
        ...(v.id ? { id: v.id } : {}), title: v.title, description: v.description, image_url: v.image_url,
        product_handle: v.product_handle.trim() || null, drop_at: new Date(v.drop_at).toISOString(),
        whatsapp_url: v.whatsapp_url.trim() || null, active: v.active,
      } });
      toast.success("Saved"); setEdit(null); refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save"); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="Drops" subtitle="Countdown drops shown on the /drops page." action={can && <button className={btn} onClick={() => setEdit({ title: "", description: "", image_url: null, product_handle: "", drop_at: toLocal(new Date(Date.now() + 7 * 864e5).toISOString()), whatsapp_url: "https://chat.whatsapp.com/JGEqcXoZEsi5NYc9hVBRqI", active: true })}><Plus className="h-4 w-4" /> New drop</button>} />
      {edit && <DropForm value={edit} busy={busy} onSave={save} onClose={() => setEdit(null)} />}
      {q.isLoading ? <Spinner /> : !q.data?.length ? <Empty>No drops yet.</Empty> : (
        <Card>
          {q.data.map((d) => (
            <div key={d.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
              {d.image_url ? <img src={d.image_url} alt="" className="h-12 w-10 rounded object-cover" /> : <div className="h-12 w-10 rounded bg-muted" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.title}{!d.active && <span className="ml-2 text-xs text-muted-foreground">(hidden)</span>}</p>
                <p className="text-xs text-muted-foreground">{dateTime(d.drop_at)}{d.product_handle ? ` · ${d.product_handle}` : ""}</p>
              </div>
              {can && <>
                <button aria-label="Edit" className="grid h-9 w-9 place-items-center rounded-lg border border-border" onClick={() => setEdit({ id: d.id, title: d.title, description: d.description, image_url: d.image_url, product_handle: d.product_handle ?? "", drop_at: toLocal(d.drop_at), whatsapp_url: d.whatsapp_url ?? "", active: d.active })}><Pencil className="h-4 w-4" /></button>
                <button aria-label="Delete" className="grid h-9 w-9 place-items-center rounded-lg border border-border text-destructive" onClick={async () => { if (!confirm("Delete this drop?")) return; await adminDeleteDrop({ data: { id: d.id } }); refresh(); }}><Trash2 className="h-4 w-4" /></button>
              </>}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function DropForm({ value, onSave, onClose, busy }: { value: Edit; onSave: (v: Edit) => void; onClose: () => void; busy: boolean }) {
  const [v, setV] = useState(value);
  const [up, setUp] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    setUp(true);
    try { const r = await adminUpload({ data: { folder: "drops", file: { type: file.type, base64: await fileToBase64(file), name: file.name } } }); setV((x) => ({ ...x, image_url: r.url })); }
    catch { toast.error("Upload failed"); } finally { setUp(false); }
  };
  return (
    <Card className="mb-4" title={v.id ? "Edit drop" : "New drop"}>
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); onSave(v); }}>
        <Field label="Title"><input required maxLength={120} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} className={inputCls} /></Field>
        <Field label="Description"><textarea maxLength={600} rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} className={inputCls} /></Field>
        <Field label="Drop date & time"><input type="datetime-local" required value={v.drop_at} onChange={(e) => setV({ ...v, drop_at: e.target.value })} className={inputCls} /></Field>
        <Field label="Product handle (opens when live)" hint="e.g. shadow-hoodie — from the product's link"><input value={v.product_handle} onChange={(e) => setV({ ...v, product_handle: e.target.value.toLowerCase() })} className={inputCls} /></Field>
        <Field label="VIP WhatsApp link"><input value={v.whatsapp_url} onChange={(e) => setV({ ...v, whatsapp_url: e.target.value })} className={inputCls} /></Field>
        <Field label="Teaser image">
          <div className="flex items-center gap-3">
            {v.image_url && <img src={v.image_url} alt="" className="h-16 w-12 rounded object-cover" />}
            <label className={btnGhost}>{up ? "Uploading…" : "Upload"}<input type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} /></label>
          </div>
        </Field>
        <Toggle checked={v.active} onChange={(a) => setV({ ...v, active: a })} label="Show on website" />
        <div className="flex gap-2"><button disabled={busy || up} className={btn}>{busy ? "Saving…" : "Save"}</button><button type="button" onClick={onClose} className={btnGhost}>Cancel</button></div>
      </form>
    </Card>
  );
}
