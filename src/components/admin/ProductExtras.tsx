import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { adminListProducts, adminSaveProductExtras } from "@/lib/admin/products.functions";
import { convert, parseSizeChart, type SizeChart } from "@/lib/sizeChart";
import { Card, btn, btnGhost, inputCls, useAction } from "@/components/admin/ui";

const PRESETS: Record<string, string[]> = {
  "T-shirt / Top": ["Chest", "Length", "Shoulder", "Sleeve"],
  "Jeans / Pants": ["Waist", "Hip", "Length", "Inseam", "Thigh"],
};

export function ProductExtras({ id, sizes, initialChart, initialPaired, canEdit }: {
  id: string; sizes: string[]; initialChart: unknown; initialPaired: string[]; canEdit: boolean;
}) {
  const { busy, run } = useAction();
  const products = useQuery({ queryKey: ["admin-products", "all", ""], queryFn: () => adminListProducts({ data: { status: "all", q: "" } }) });
  const [chart, setChart] = useState<SizeChart | null>(parseSizeChart(initialChart));
  const [paired, setPaired] = useState<string[]>(initialPaired);
  useEffect(() => { setChart(parseSizeChart(initialChart)); setPaired(initialPaired); }, [initialChart, initialPaired]);

  const start = (cols: string[]) => setChart({ unit: "in", columns: cols, rows: (sizes.length ? sizes : ["S", "M", "L", "XL"]).map((s) => ({ size: s, values: cols.map(() => null) })) });
  const setCell = (r: number, c: number, v: string) => chart && setChart({ ...chart, rows: chart.rows.map((row, i) => i !== r ? row : { ...row, values: chart.columns.map((_, j) => j === c ? (v === "" ? null : Number(v)) : row.values[j] ?? null) }) });
  const switchUnit = (u: "in" | "cm") => chart && chart.unit !== u && setChart({ ...chart, unit: u, rows: chart.rows.map((r) => ({ ...r, values: r.values.map((v) => v == null ? null : convert(v, chart.unit, u)) })) });

  const save = () => run("extras", () => adminSaveProductExtras({ data: { id, paired_product_ids: paired, size_chart: chart ? { ...chart, note: chart.note ?? "", rows: chart.rows.filter((r) => r.size.trim()), columns: chart.columns.map((c) => c.trim() || "Size") } : null } }), "Size chart & outfit saved", ["product-extras", "admin-product"]);
  const others = (products.data ?? []).filter((p) => p.id !== id);

  return (
    <>
      <Card title="Size chart" action={chart && (
        <div className="flex rounded-lg border border-border text-xs">
          {(["in", "cm"] as const).map((u) => <button key={u} type="button" onClick={() => switchUnit(u)} className={`px-3 py-1.5 ${chart.unit === u ? "bg-foreground text-background" : ""}`}>{u === "in" ? "Inches" : "CM"}</button>)}
        </div>
      )}>
        {!chart ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([k, cols]) => <button key={k} type="button" disabled={!canEdit} onClick={() => start(cols)} className={btnGhost}><Plus className="h-4 w-4" /> {k}</button>)}
            <button type="button" disabled={!canEdit} onClick={() => start(["Chest"])} className={btnGhost}><Plus className="h-4 w-4" /> Custom</button>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Type measurements in {chart.unit === "in" ? "inches" : "cm"}. Switching unit converts the numbers automatically, and customers can view both.</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead><tr>
                  <th className="pb-2 pr-2 text-left text-xs text-muted-foreground">Size</th>
                  {chart.columns.map((c, j) => (
                    <th key={j} className="pb-2 pr-2"><div className="flex gap-1">
                      <input value={c} onChange={(e) => setChart({ ...chart, columns: chart.columns.map((x, k) => k === j ? e.target.value : x) })} className={`${inputCls} w-24`} />
                      {chart.columns.length > 1 && <button type="button" aria-label="Remove column" onClick={() => setChart({ ...chart, columns: chart.columns.filter((_, k) => k !== j), rows: chart.rows.map((r) => ({ ...r, values: r.values.filter((_, k) => k !== j) })) })}><X className="h-3.5 w-3.5" /></button>}
                    </div></th>
                  ))}
                  <th />
                </tr></thead>
                <tbody>
                  {chart.rows.map((r, i) => (
                    <tr key={i}>
                      <td className="py-1 pr-2"><input value={r.size} onChange={(e) => setChart({ ...chart, rows: chart.rows.map((x, k) => k === i ? { ...x, size: e.target.value } : x) })} className={`${inputCls} w-20`} /></td>
                      {chart.columns.map((_, j) => <td key={j} className="py-1 pr-2"><input type="number" step="0.1" min={0} value={r.values[j] ?? ""} onChange={(e) => setCell(i, j, e.target.value)} className={`${inputCls} w-24`} /></td>)}
                      <td><button type="button" aria-label="Remove size" onClick={() => setChart({ ...chart, rows: chart.rows.filter((_, k) => k !== i) })} className="grid h-9 w-9 place-items-center text-muted-foreground"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className={btnGhost} onClick={() => setChart({ ...chart, rows: [...chart.rows, { size: "", values: chart.columns.map(() => null) }] })}><Plus className="h-4 w-4" /> Size</button>
              {chart.columns.length < 8 && <button type="button" className={btnGhost} onClick={() => setChart({ ...chart, columns: [...chart.columns, "New"], rows: chart.rows.map((r) => ({ ...r, values: [...r.values, null] })) })}><Plus className="h-4 w-4" /> Measurement</button>}
              <button type="button" className={btnGhost} onClick={() => setChart(null)}><Trash2 className="h-4 w-4" /> Remove chart</button>
            </div>
            <textarea value={chart.note ?? ""} onChange={(e) => setChart({ ...chart, note: e.target.value })} rows={2} placeholder="Fit tip, e.g. Oversized fit — take your usual size." className={`${inputCls} mt-3`} />
          </div>
        )}
      </Card>

      <Card title="Complete the fit" action={<span className="text-xs text-muted-foreground">{paired.length}/8</span>}>
        <p className="mb-2 text-xs text-muted-foreground">Pick pieces that go with this product. They show under it on the product page.</p>
        <div className="flex flex-wrap gap-2">
          {paired.map((pid) => { const p = others.find((x) => x.id === pid); return (
            <span key={pid} className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-2 text-xs">
              {p?.image && <img src={p.image} alt="" className="h-6 w-6 rounded-full object-cover" />}{p?.title ?? "…"}
              <button type="button" aria-label="Remove" onClick={() => setPaired(paired.filter((x) => x !== pid))}><X className="h-3 w-3" /></button>
            </span>
          ); })}
        </div>
        {paired.length < 8 && (
          <select value="" disabled={!canEdit} onChange={(e) => e.target.value && setPaired([...paired, e.target.value])} className={`${inputCls} mt-3`}>
            <option value="">+ Add a product…</option>
            {others.filter((p) => !paired.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.title}{p.status !== "active" ? ` (${p.status})` : ""}</option>)}
          </select>
        )}
      </Card>
      {canEdit && <button type="button" onClick={save} disabled={!!busy} className={btn}>{busy === "extras" && <Loader2 className="h-4 w-4 animate-spin" />} Save size chart & outfit</button>}
    </>
  );
}
