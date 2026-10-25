import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History, Search } from "lucide-react";
import { adminAdjustStock, adminInventory, adminStockHistory } from "@/lib/admin/products.functions";
import { Empty, PageHeader, ReadOnlyNote, Spinner, Tabs, dateTime, inputCls, useAction, useCanEdit } from "@/components/admin/ui";

type Filter = "all" | "low" | "out";
export const Route = createFileRoute("/admin/inventory")({
  validateSearch: (s: Record<string, unknown>): { filter?: Filter | undefined } => ({
    filter: ["low", "out"].includes(String(s["filter"])) ? (s["filter"] as Filter) : undefined,
  }),
  component: Inventory,
});

function Inventory() {
  const { filter = "all" } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/inventory" });
  const [q, setQ] = useState("");
  const [history, setHistory] = useState<string | null>(null);
  const canEdit = useCanEdit("products");
  const res = useQuery({ queryKey: ["admin-inventory", filter, q], queryFn: () => adminInventory({ data: { filter, q } }) });

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Type a new count and press Enter. Every change is logged." />
      <ReadOnlyNote section="products" />
      <Tabs value={filter} onChange={(v) => navigate({ search: { filter: v === "all" ? undefined : v } })} options={[["all", "All"], ["low", `Low stock${res.data ? ` (≤${res.data.threshold})` : ""}`], ["out", "Sold out"]]} />
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className={`${inputCls} pl-9`} />
      </div>
      {res.isLoading ? <Spinner /> : !res.data?.rows.length ? <Empty>Nothing here.</Empty> : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
          {res.data.rows.map((v) => (
            <li key={v.id} className="px-3 py-2.5 text-sm">
              <div className="flex items-center gap-3">
                {v.image ? <img src={v.image} alt="" className="h-10 w-10 rounded-md object-cover" /> : <div className="h-10 w-10 rounded-md bg-muted" />}
                <Link to="/admin/products/$id" params={{ id: v.productId }} className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{v.product}</span>
                  <span className="text-xs text-muted-foreground">{v.title}{v.sku ? ` · ${v.sku}` : ""}{v.status !== "active" ? ` · ${v.status}` : ""}</span>
                </Link>
                <button onClick={() => setHistory(history === v.id ? null : v.id)} aria-label="History" className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground"><History className="h-4 w-4" /></button>
                <StockInput variantId={v.id} stock={v.stock} disabled={!canEdit} threshold={res.data.threshold} />
              </div>
              {history === v.id && <StockHistory variantId={v.id} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StockInput({ variantId, stock, disabled, threshold }: { variantId: string; stock: number; disabled: boolean; threshold: number }) {
  const [val, setVal] = useState(String(stock));
  const { busy, run } = useAction();
  const save = () => {
    const n = Number(val);
    if (!Number.isInteger(n) || n < 0 || n === stock) { setVal(String(stock)); return; }
    void run("s", () => adminAdjustStock({ data: { variantId, set: n, reason: "Manual count" } }), "Stock updated", ["admin-inventory", "admin-dashboard"]);
  };
  return (
    <input
      type="number" min={0} value={val} disabled={disabled || !!busy} aria-label="Stock"
      onChange={(e) => setVal(e.target.value)} onBlur={save} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className={`${inputCls} w-20 text-right ${stock === 0 ? "border-destructive/50 text-destructive" : stock <= threshold ? "border-amber-500/60" : ""}`}
    />
  );
}

function StockHistory({ variantId }: { variantId: string }) {
  const q = useQuery({ queryKey: ["stock-history", variantId], queryFn: () => adminStockHistory({ data: { variantId } }) });
  if (q.isLoading) return <p className="mt-2 text-xs text-muted-foreground">Loading…</p>;
  if (!q.data?.length) return <p className="mt-2 text-xs text-muted-foreground">No changes recorded yet.</p>;
  return (
    <ul className="mt-2 space-y-1 rounded-lg bg-muted/50 p-2 text-xs">
      {q.data.map((h) => (
        <li key={h.id} className="flex gap-2">
          <span className={`w-10 font-semibold ${h.delta > 0 ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}`}>{h.delta > 0 ? `+${h.delta}` : h.delta}</span>
          <span className="min-w-0 flex-1 truncate">{h.reason} → {h.stock_after}</span>
          <span className="text-muted-foreground">{dateTime(h.created_at)}{h.actor && h.actor !== "system" ? ` · ${h.actor}` : ""}</span>
        </li>
      ))}
    </ul>
  );
}
