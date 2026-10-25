import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { adminBulkProductStatus, adminListProducts } from "@/lib/admin/products.functions";
import { Empty, PageHeader, Spinner, StatusBadge, Tabs, btn, btnGhost, inr, inputCls, useAction, useCanEdit } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/products/")({ component: Products });

function Products() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"all" | "active" | "draft" | "archived">("all");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const canEdit = useCanEdit("products");
  const { busy, run } = useAction();
  const res = useQuery({ queryKey: ["admin-products", status, q], queryFn: () => adminListProducts({ data: { status, q } }) });
  const bulk = (s: "active" | "draft" | "archived") =>
    run("bulk", () => adminBulkProductStatus({ data: { ids: picked, status: s } }), `${picked.length} product(s) updated`, ["admin-products"]).then(() => setPicked([]));

  return (
    <div>
      <PageHeader title="Products" action={canEdit && <Link to="/admin/products/$id" params={{ id: "new" }} className={btn}><Plus className="h-4 w-4" /> Add product</Link>} />
      <Tabs value={status} onChange={setStatus} options={[["all", "All"], ["active", "Active"], ["draft", "Draft"], ["archived", "Archived"]]} />
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className={`${inputCls} pl-9`} />
        </div>
        {canEdit && picked.length > 0 && (
          <div className="flex gap-2">
            <button disabled={!!busy} onClick={() => bulk("active")} className={btnGhost}>Set active</button>
            <button disabled={!!busy} onClick={() => bulk("draft")} className={btnGhost}>Set draft</button>
            <button disabled={!!busy} onClick={() => bulk("archived")} className={btnGhost}>Archive</button>
          </div>
        )}
      </div>
      {res.isLoading ? <Spinner /> : !res.data?.length ? <Empty>No products yet. Add your first one.</Empty> : (
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                {canEdit && <th className="w-10 px-3 py-2.5"><input type="checkbox" aria-label="Select all" checked={picked.length === res.data.length} onChange={(e) => setPicked(e.target.checked ? res.data!.map((p) => p.id) : [])} /></th>}
                <th className="px-3 py-2.5">Product</th><th className="px-3 py-2.5">Status</th><th className="hidden px-3 py-2.5 sm:table-cell">Inventory</th><th className="hidden px-3 py-2.5 md:table-cell">Category</th><th className="px-3 py-2.5 text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {res.data.map((p) => (
                <tr key={p.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate({ to: "/admin/products/$id", params: { id: p.id } })}>
                  {canEdit && <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${p.title}`} checked={picked.includes(p.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, p.id] : picked.filter((x) => x !== p.id))} /></td>}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      {p.image ? <img src={p.image} alt="" className="h-10 w-10 rounded-md bg-card object-cover" /> : <div className="h-10 w-10 rounded-md bg-muted" />}
                      <span className="min-w-0 truncate font-medium">{p.title}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={p.status} /></td>
                  <td className={`hidden px-3 py-2 sm:table-cell ${p.stock === 0 ? "text-destructive" : "text-muted-foreground"}`}>{p.stock} in stock · {p.variants} variant{p.variants === 1 ? "" : "s"}</td>
                  <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">{p.category}</td>
                  <td className="px-3 py-2 text-right">{inr(p.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
