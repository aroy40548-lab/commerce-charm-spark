import { Link } from "@tanstack/react-router";
import { Heart, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatMoney, type ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";


export function ProductCard({ product }: { product: ShopifyProduct }) {
  const node = product.node;
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);
  const wishlistItems = useWishlistStore((s) => s.items);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const wished = wishlistItems.some((i) => i.handle === node.handle);

  const image = node.images.edges[0]?.node;
  const variant = node.variants.edges.find((v) => v.node.availableForSale)?.node ?? node.variants.edges[0]?.node;
  const compareAt = variant?.compareAtPrice;

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!variant) return;
    await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || [],
    });
    toast.success(`${node.title} added to bag`, { position: "top-center" });
  };

  return (
    <Link to="/product/$handle" params={{ handle: node.handle }} className="group block">
      <div className="relative overflow-hidden rounded-xl bg-card p-4">
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist({
              handle: node.handle,
              title: node.title,
              image: image?.url ?? null,
              price: node.priceRange.minVariantPrice.amount,
              currencyCode: node.priceRange.minVariantPrice.currencyCode,
            });
          }}
          aria-label="Toggle wishlist"
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-background/70 backdrop-blur transition-colors hover:bg-background"
        >
          <Heart className={`h-4 w-4 ${wished ? "fill-accent text-accent" : "text-foreground"}`} strokeWidth={1.5} />
        </button>
        {image ? (
          <img
            src={image.url}
            alt={image.altText ?? node.title}
            loading="lazy"
            className="aspect-square w-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="aspect-square w-full" />
        )}
      </div>

      <div className="mt-3 space-y-1">
        <h3 className="truncate text-sm text-foreground">{node.title}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">
            {formatMoney(node.priceRange.minVariantPrice.amount, node.priceRange.minVariantPrice.currencyCode)}
          </span>
          {compareAt && (
            <span className="text-xs text-muted-foreground line-through">
              {formatMoney(compareAt.amount, compareAt.currencyCode)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-end pt-1">
          <button
            onClick={handleAdd}
            disabled={isLoading || !variant}
            aria-label={`Add ${node.title} to bag`}
            className="grid h-7 w-7 place-items-center rounded-full border border-muted-foreground/50 transition-colors hover:border-foreground hover:bg-foreground hover:text-background disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </Link>
  );
}
