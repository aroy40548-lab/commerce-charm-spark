import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { adminListProducts, adminSaveProductExtras } from "@/lib/admin/products.functions";
import { Card, Empty, Field, Spinner, btn, inputCls, useAction, useCanEdit } from "@/components/admin/ui";

/** Attach fit pieces to a product and set its own bundle %. Pieces auto-connect both ways. */
export function BundleManager() {
  const q = useQuery({ queryKey: ["admin-products", "bundles"], queryFn: () => adminListProducts({ data: { status: "all" } }) });
  const canEdit = useCanEdit("products");
  const { busy, run } = useAction();
  const [id, setId] = useState("");
  const [paired, setPaired] = useState<string[]>([]);
  const [pct, setPct] = useState("");
  const [find, setFind] = useState("");
  const list = q.data ?? [];
  const cur = list.find((p) => p.id === id);
  useEffect(() => { setPaired(cur?.paired ?? []); setPct(cur?.bundle == null ? "" : String(cur.bundle)); }, [cur]);
  if (q.isLoading) return <Spinner />;
  const name = (x: string) => list.find((p) => p.id === x)?.title ?? "Product";
  const bundles = list.filter((p) => p.paired.length);
  return (
    <div className="space-y-4">
      <Card title="Attach bundle products">
        <div className="grid gap-3">
          <Field label="Main product">
            <select value={id} onChange={(e) => setId(e.target.value)} className={inputCls}>
              <option value="">Choose a product…</option>
              {list.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </Field>
          {cur && <>
            <Field label={`Pieces in this fit (${paired.length}/8)`} hint="They link to each other automatically.">
              <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search products" className={inputCls} />
            </Field>
            <div className="max-h-64 space-y-1 overflow-auto rounded-lg border border-border p-2">
              {list.filter((p) => p.id !== id && p.title.toLowerCase().includes(find.toLowerCase())).map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" disabled={!canEdit || (!paired.includes(p.id) && paired.length >= 8)} checked={paired.includes(p.id)}
                    onChange={(e) => setPaired(e.target.checked ? [...paired, p.id] : paired.filter((x) => x !== p.id))} />
                  {p.title}
                </label>
              ))}
            </div>
            <Field label="This bundle's discount (%)" hint="Leave empty to use the discount for all bundles (Settings). This one replaces it.">
              <input type="number" min={0} max={90} value={pct} onChange={(e) => setPct(e.target.value)} className={inputCls} />
            </Field>
            {canEdit && <button disabled={!!busy} className={btn} onClick={() => run("b", () => adminSaveProductExtras({ data: { id, paired_product_ids: paired, bundle_discount_percent: pct === "" ? null : Number(pct) } }), "Bundle saved", ["admin-products", "product-extras"])}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save bundle</button>}
          </>}
        </div>
      </Card>
      <Card title="Current bundles">
        {!bundles.length ? <Empty>No bundles yet.</Empty> : (
          <ul className="divide-y divide-border text-sm">
            {bundles.map((p) => (
              <li key={p.id} className="py-2">
                <button onClick={() => setId(p.id)} className="text-left">
                  <b>{p.title}</b> <span className="text-muted-foreground">+ {p.paired.map(name).join(", ")}{p.bundle != null ? ` · ${p.bundle}% off` : " · store-wide %"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
