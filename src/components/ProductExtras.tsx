import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Ruler, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { OPEN_BAG_EVENT } from "@/components/BottomTabBar";
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

type FitProduct = NonNullable<ReturnType<typeof useProductExtras>["data"]>["paired"][number];

// Reels-style "pieces in this fit" tray with per-piece size + one-tap "Add entire fit".
export function CompleteTheFit({ products, current, bundlePct = 0 }: { products: FitProduct[]; current?: FitProduct; bundlePct?: number }) {
  const addItem = useCartStore((s) => s.addItem);
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  if (!products.length) return null;
  const all = current ? [current, ...products] : products;
  const variantsOf = (p: FitProduct) => p.node.variants.edges.map((e) => e.node).filter((v) => v.availableForSale && v.quantityAvailable > 0);
  const addFit = async () => {
    const picks = all.map((p) => ({ p, v: variantsOf(p).find((v) => v.id === sizes[p.node.id]) ?? (variantsOf(p).length === 1 ? variantsOf(p)[0] : undefined) }));
    const missing = picks.filter((x) => !x.v && variantsOf(x.p).length);
    if (missing.length) { toast.error(`Pick a size for ${missing[0].p.node.title}`, { position: "top-center" }); return; }
    setBusy(true);
    try {
      for (const { p, v } of picks) if (v) await addItem({ product: p, variantId: v.id, variantTitle: v.title, price: v.price, quantity: 1, selectedOptions: v.selectedOptions || [] });
      toast.success(bundlePct > 0 ? `Fit added — ${bundlePct}% bundle discount applies at checkout` : "Entire fit added to bag", { position: "top-center" });
      window.dispatchEvent(new Event(OPEN_BAG_EVENT));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't add", { position: "top-center" }); }
    finally { setBusy(false); }
  };
  return (
    <section className="zk-hide-vton mt-8 border-t border-border pt-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="zk-label text-[11px] text-muted-foreground">Complete the fit · {all.length} pieces</h2>
        {bundlePct > 0 && <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold text-accent-foreground">Bundle & save {bundlePct}%</span>}
      </div>
      <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
        {all.map((p) => {
          const vs = variantsOf(p);
          return (
            <div key={p.node.id} className="w-36 shrink-0 snap-start rounded-xl border border-border bg-card p-2">
              <Link to="/product/$handle" params={{ handle: p.node.handle }}>
                {p.node.images.edges[0] && <img src={p.node.images.edges[0].node.url} alt={p.node.title} loading="lazy" className="aspect-square w-full rounded-lg object-contain" />}
                <p className="mt-1.5 truncate text-xs">{p === current ? "This piece" : p.node.title}</p>
              </Link>
              <p className="text-xs font-semibold">{formatMoney(p.node.priceRange.minVariantPrice.amount, p.node.priceRange.minVariantPrice.currencyCode)}</p>
              {vs.length ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {vs.map((v) => (
                    <button key={v.id} type="button" onClick={() => setSizes({ ...sizes, [p.node.id]: v.id })}
                      className={`min-h-7 min-w-7 rounded-full border px-1.5 text-[10px] ${sizes[p.node.id] === v.id ? "border-foreground bg-foreground text-background" : "border-border"}`}>{v.title}</button>
                  ))}
                </div>
              ) : <p className="mt-1.5 text-[10px] text-muted-foreground">Sold out</p>}
            </div>
          );
        })}
      </div>
      <button type="button" onClick={addFit} disabled={busy} className="zk-label mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-xs text-background disabled:opacity-60">
        <ShoppingBag className="h-4 w-4" /> Add entire fit to bag
      </button>
    </section>
  );
}
