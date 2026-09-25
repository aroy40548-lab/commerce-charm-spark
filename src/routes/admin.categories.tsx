import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { imageUrl } from "@/lib/catalog";
import { btn, Card, inputCls, PageHeader } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/categories")({ component: Categories });

function Categories() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data: cats } = useQuery({
    queryKey: ["admin-cats-full"],
    queryFn: async () => (await supabase.from("categories").select("*, products(count)").order("position")).data ?? [],
  });
  const refresh = () => qc.invalidateQueries();

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("categories").insert({ name, position: (cats?.length ?? 0) + 1 });
    if (error) return toast.error(error.message);
    setName(""); refresh();
  };
  const update = async (id: string, patch: { name?: string; image_url?: string; position?: number }) => {
    const { error } = await supabase.from("categories").update(patch).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };
  const move = async (i: number, dir: -1 | 1) => {
    const a = cats![i]!, b = cats![i + dir];
    if (!b) return;
    await update(a.id, { position: b.position });
    await update(b.id, { position: a.position });
  };
  const upload = async (id: string, f: File | undefined) => {
    if (!f) return;
    const path = `categories/${crypto.randomUUID()}.${f.name.split(".").pop() ?? "jpg"}`;
    const { error } = await supabase.storage.from("product-images").upload(path, f, { contentType: f.type });
    if (error) return toast.error(error.message);
    update(id, { image_url: `storage:${path}` });
  };

  return (
    <>
      <PageHeader title="Categories" />
      <form onSubmit={add} className="mb-4 flex max-w-md gap-2">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" className={inputCls} />
        <button className={btn}>Add</button>
      </form>
      <Card className="divide-y divide-border p-0">
        {cats?.map((c, i) => (
          <div key={c.id} className="flex items-center gap-3 p-3">
            <label className="relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-muted">
              {c.image_url ? <img src={imageUrl(c.image_url)} alt="" className="h-full w-full object-cover" /> : <Upload className="m-auto mt-3.5 h-5 w-5 text-muted-foreground" />}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(c.id, e.target.files?.[0])} />
            </label>
            <input defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && update(c.id, { name: e.target.value })} className={`${inputCls} max-w-xs`} />
            <span className="text-xs text-muted-foreground">{(c.products as unknown as Array<{ count: number }>)?.[0]?.count ?? 0} products</span>
            <div className="ml-auto flex gap-1">
              <button onClick={() => move(i, -1)} className="p-1.5 text-muted-foreground hover:text-foreground"><ArrowUp className="h-4 w-4" /></button>
              <button onClick={() => move(i, 1)} className="p-1.5 text-muted-foreground hover:text-foreground"><ArrowDown className="h-4 w-4" /></button>
              <button onClick={async () => { if (confirm(`Delete "${c.name}"? Products stay but lose this category.`)) { await supabase.from("categories").delete().eq("id", c.id); refresh(); } }} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}
