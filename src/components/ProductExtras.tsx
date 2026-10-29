import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Ruler } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getProductExtras } from "@/lib/catalog.functions";
import { formatMoney } from "@/lib/catalog";
import { convert, parseSizeChart, type SizeUnit } from "@/lib/sizeChart";

export function useProductExtras(handle: string) {
  return useQuery({ queryKey: ["product-extras", handle], queryFn: () => getProductExtras({ data: { handle } }), staleTime: 60_000 });
}

export function SizeChartButton({ raw }: { raw: unknown }) {
  const chart = parseSizeChart(raw);
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState<SizeUnit>("in");
  if (!chart) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="zk-label mt-3 inline-flex min-h-9 items-center gap-1.5 text-[11px] text-accent underline-offset-4 hover:underline">
        <Ruler className="h-3.5 w-3.5" /> Size chart
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="zk-display text-2xl">Size chart</DialogTitle></DialogHeader>
          <div className="flex w-fit rounded-full border border-border p-0.5 text-xs">
            {(["in", "cm"] as const).map((u) => (
              <button key={u} onClick={() => setUnit(u)} className={`rounded-full px-4 py-1.5 ${unit === u ? "bg-foreground text-background" : "text-muted-foreground"}`}>{u === "in" ? "Inches" : "CM"}</button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3">Size</th>{chart.columns.map((c) => <th key={c} className="py-2 pr-3">{c}</th>)}
              </tr></thead>
              <tbody>{chart.rows.map((r) => (
                <tr key={r.size} className="border-b border-border/60">
                  <td className="py-2.5 pr-3 font-semibold">{r.size}</td>
                  {chart.columns.map((c, j) => { const v = r.values[j]; return <td key={c} className="py-2.5 pr-3 tabular-nums">{v == null ? "—" : convert(v, chart.unit, unit)}</td>; })}
                </tr>
              ))}</tbody>
            </table>
          </div>
          {chart.note && <p className="rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">{chart.note}</p>}
          <p className="text-[11px] text-muted-foreground">Garment measurements laid flat. 1 inch = 2.54 cm.</p>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CompleteTheFit({ products }: { products: NonNullable<ReturnType<typeof useProductExtras>["data"]>["paired"] }) {
  if (!products.length) return null;
  return (
    <section className="mt-8 border-t border-border pt-6">
      <h2 className="zk-label text-[11px] text-muted-foreground">Complete the fit</h2>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {products.map((p) => (
          <Link key={p.node.id} to="/product/$handle" params={{ handle: p.node.handle }} className="w-28 shrink-0">
            <div className="overflow-hidden rounded-lg bg-card p-2">
              {p.node.images.edges[0] && <img src={p.node.images.edges[0].node.url} alt={p.node.title} loading="lazy" className="aspect-square w-full object-contain" />}
            </div>
            <p className="mt-1.5 truncate text-xs">{p.node.title}</p>
            <p className="text-xs font-semibold">{formatMoney(p.node.priceRange.minVariantPrice.amount, p.node.priceRange.minVariantPrice.currencyCode)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
