import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { formatMoney } from "@/lib/catalog";

export function ProductPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const products = useProducts();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const all = (products.data ?? []).map((p) => p.node);
    const s = q.trim().toLowerCase();
    return (s ? all.filter((p) => p.title.toLowerCase().includes(s)) : all).slice(0, 30);
  }, [products.data, q]);
  const byId = new Map((products.data ?? []).map((p) => [p.node.id, p.node]));
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : value.length >= 5 ? value : [...value, id]);

  return (
    <div>
      <p className="zk-label text-[11px] text-muted-foreground">Tag products ({value.length}/5)</p>
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {value.map((id) => (
            <button key={id} type="button" onClick={() => toggle(id)} className="flex items-center gap-1 bg-foreground px-2 py-1 text-xs text-background">
              {byId.get(id)?.title ?? "Product"} <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products to tag" className="mt-2 min-h-11 w-full border border-border bg-background px-3 text-base sm:text-sm" />
      <div className="mt-2 max-h-56 overflow-y-auto border border-border">
        {list.map((p) => {
          const on = value.includes(p.id);
          return (
            <button key={p.id} type="button" onClick={() => toggle(p.id)} className={`flex w-full items-center gap-3 border-b border-border p-2 text-left last:border-0 ${on ? "bg-muted" : ""}`}>
              <div className="h-10 w-10 shrink-0 overflow-hidden bg-muted">{p.images.edges[0] && <img src={p.images.edges[0].node.url} alt="" className="h-full w-full object-cover" />}</div>
              <span className="min-w-0 flex-1 truncate text-sm">{p.title}</span>
              <span className="text-xs text-muted-foreground">{formatMoney(p.priceRange.minVariantPrice.amount)}</span>
              {on && <Check className="h-4 w-4" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
