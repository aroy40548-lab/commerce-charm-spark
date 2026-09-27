import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Loader2, Heart } from "lucide-react";
import { toast } from "sonner";
import { useCategories, useProduct, useProducts } from "@/hooks/useProducts";
import { formatMoney } from "@/lib/catalog";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { openDecartTryOn } from "@/lib/decart";

export const Route = createFileRoute("/product/$handle")({
  head: ({ params }) => {
    const name = params.handle
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return {
      meta: [
        { title: `${name} — ZANKYO` },
        { name: "description", content: `${name} from ZANKYO. Y2K streetwear built for a different generation.` },
        { property: "og:title", content: `${name} — ZANKYO` },
        { property: "og:description", content: `${name} from the ZANKYO streetwear collection.` },
      ],
    };
  },
  component: ProductDetail,
});


function ProductDetail() {
  const { handle } = Route.useParams();
  const { data: product, isLoading } = useProduct(handle);
  const { data: allProducts } = useProducts();
  const { data: cats } = useCategories();
  const CATEGORIES = (cats ?? []).map((c) => c.name);
  const addItem = useCartStore((s) => s.addItem);
  const cartLoading = useCartStore((s) => s.isLoading);
  const wishlist = useWishlistStore((s) => s.items);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const [variantId, setVariantId] = useState<string | null>(null);

  const variants = product?.node.variants.edges.map((e) => e.node) ?? [];
  const selected = useMemo(
    () => variants.find((v) => v.id === variantId) ?? variants.find((v) => v.availableForSale) ?? variants[0],
    [variants, variantId],
  );

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4 text-center">
        <div>
          <h1 className="zk-display text-3xl">Not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">This piece isn't available.</p>
          <Link
            to="/shop"
            search={{ q: undefined, category: undefined }}
            className="zk-label mt-6 inline-block rounded-full bg-foreground px-6 py-3 text-xs text-background"
          >
            Back to shop
          </Link>
        </div>
      </div>
    );
  }

  const node = product.node;
  const image = node.images.edges[0]?.node;
  const wished = wishlist.some((i) => i.handle === node.handle);
  const related = (allProducts ?? []).filter((p) => p.node.handle !== node.handle).slice(0, 4);

  const handleAdd = async () => {
    if (!selected) return;
    try {
      await addItem({
        product,
        variantId: selected.id,
        variantTitle: selected.title,
        price: selected.price,
        quantity: 1,
        selectedOptions: selected.selectedOptions || [],
      });
      toast.success(`${node.title} added to bag`, { position: "top-center" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add to bag", { position: "top-center" });
    }
  };

  const handleTryOn = () => {
    const opened = openDecartTryOn(image?.url);
    if (!opened) {
      toast.error("The AI fitting room is still loading — try again in a moment.", { position: "top-center" });
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] overflow-hidden px-4 py-6 sm:px-6 sm:py-10">
      <div className="grid gap-7 sm:gap-10 lg:grid-cols-[180px_1fr_380px]">
        <aside className="hidden lg:block">
          <h2 className="zk-label text-[11px] text-muted-foreground">Categories</h2>
          <ul className="mt-3 space-y-1">
            {CATEGORIES.map((c) => (
              <li key={c}>
                <Link
                  to="/shop"
                  search={{ q: undefined, category: c }}
                  className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                >
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className="rounded-lg bg-card p-3 sm:p-6">
          {image && (
            <img src={image.url} alt={node.title} fetchPriority="high" className="aspect-square h-auto w-full rounded-lg object-contain" />
          )}
        </div>

        <div>
          <h1 className="zk-display break-words text-3xl leading-tight">{node.title}</h1>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-2xl font-bold">
              {selected ? formatMoney(selected.price.amount, selected.price.currencyCode) : ""}
            </span>
            {selected?.compareAtPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatMoney(selected.compareAtPrice.amount, selected.compareAtPrice.currencyCode)}
              </span>
            )}
          </div>

          <p className="mt-4 text-sm leading-6 text-muted-foreground">{node.description}</p>

          {variants.length > 1 && (
            <div className="mt-6">
              <h2 className="zk-label text-[11px] text-muted-foreground">{node.options[0]?.name ?? "Size"}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVariantId(v.id)}
                    disabled={!v.availableForSale}
                    title={v.availableForSale ? "In stock" : "Sold out"}
                    className={`min-h-11 min-w-12 rounded-lg border px-4 py-2 text-sm transition-colors active:opacity-80 disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
                      selected?.id === v.id ? "border-foreground bg-foreground text-background" : "border-border"
                    }`}
                  >
                    {v.title}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {selected?.availableForSale ? `${selected.title} is in stock` : "This size is sold out"}
              </p>
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={cartLoading || !selected?.availableForSale}
            className="zk-label mt-7 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-foreground py-4 text-xs text-background active:opacity-80 disabled:opacity-60"
          >
            {cartLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : selected?.availableForSale ? "Add to cart" : "Sold out"}
          </button>

          <button
            onClick={handleTryOn}
            className="zk-label mt-3 hidden min-h-12 w-full items-center justify-center gap-2 rounded-full border border-foreground py-4 text-xs text-foreground transition-colors hover:bg-muted active:bg-muted sm:flex"
          >
            <Camera className="h-4 w-4" /> Virtual try-on (AI)
          </button>

          <button
            onClick={() =>
              toggleWishlist({
                handle: node.handle,
                title: node.title,
                image: image?.url ?? null,
                price: node.priceRange.minVariantPrice.amount,
                currencyCode: node.priceRange.minVariantPrice.currencyCode,
              })
            }
            className="mt-3 flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground active:text-foreground lg:mt-4"
          >
            <Heart className={`h-4 w-4 ${wished ? "fill-accent text-accent" : ""}`} />
            {wished ? "Saved to wishlist" : "Save to wishlist"}
          </button>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14 sm:mt-20">
          <h2 className="zk-label text-sm">You may also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 sm:gap-y-8 md:grid-cols-4">
            {related.map((p) => (
              <Link key={p.node.id} to="/product/$handle" params={{ handle: p.node.handle }} className="group block">
                <div className="overflow-hidden rounded-xl bg-card p-4">
                  {p.node.images.edges[0]?.node && (
                    <img
                      src={p.node.images.edges[0].node.url}
                      alt={p.node.title}
                      loading="lazy"
                      className="aspect-square w-full object-contain transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </div>
                <h3 className="mt-3 truncate text-sm">{p.node.title}</h3>
                <p className="text-sm font-semibold">
                  {formatMoney(p.node.priceRange.minVariantPrice.amount, p.node.priceRange.minVariantPrice.currencyCode)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
