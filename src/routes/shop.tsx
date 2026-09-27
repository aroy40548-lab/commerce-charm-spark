import { createFileRoute, Link } from "@tanstack/react-router";
import { useCategories, useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/ProductCard";

type ShopSearch = { q?: string | undefined; category?: string | undefined };

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    q: typeof search["q"] === "string" && search["q"] ? search["q"] : undefined,
    category: typeof search["category"] === "string" && search["category"] ? search["category"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop All — ZANKYO" },
      { name: "description", content: "Browse the full ZANKYO catalog: tees, baggy jeans, hoodies, headwear, accessories and footwear." },
      { property: "og:title", content: "Shop All — ZANKYO" },
      { property: "og:description", content: "Browse the full ZANKYO streetwear catalog." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://zankyo.in/shop" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://zankyo.in/shop" }],
  }),
  component: Shop,
});


function Shop() {
  const { q, category } = Route.useSearch();
  const { data: products, isLoading } = useProducts();
  const { data: cats } = useCategories();
  const CATEGORIES = ["All", ...(cats ?? []).map((c) => c.name)];

  const filtered = (products ?? []).filter((p) => {
    const matchesCategory = !category || category === "All" || p.node.productType === category;
    const needle = q?.toLowerCase();
    const matchesQuery =
      !needle ||
      p.node.title.toLowerCase().includes(needle) ||
      p.node.description.toLowerCase().includes(needle) ||
      p.node.productType.toLowerCase().includes(needle);
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="mx-auto max-w-[1600px] overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="zk-display text-4xl">Shop</h1>
      {q && <p className="mt-2 text-sm text-muted-foreground">Results for “{q}”</p>}

      <div className="mt-6 grid gap-7 lg:mt-8 lg:grid-cols-[200px_1fr] lg:gap-8">
        <aside>
          <h2 className="zk-label text-[11px] text-muted-foreground">Categories</h2>
          <ul className="mobile-scroll-hint -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
            {CATEGORIES.map((c) => {
              const active = (category ?? "All") === c;
              return (
                <li key={c}>
                  <Link
                    to="/shop"
                    search={{ q, category: c === "All" ? undefined : c }}
                    className={`flex min-h-11 items-center whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors lg:min-h-0 lg:rounded-lg ${
                      active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {c}
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>

        <div>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 sm:gap-y-8 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-xl bg-card" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-20 text-center text-sm text-muted-foreground">No products found</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 sm:gap-y-8 md:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <ProductCard key={p.node.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
