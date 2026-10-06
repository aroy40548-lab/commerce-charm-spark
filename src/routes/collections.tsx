import { createFileRoute, Link } from "@tanstack/react-router";
import { useCategories } from "@/hooks/useProducts";

export const Route = createFileRoute("/collections")({
  head: () => ({
    meta: [
      { title: "Collections — ZANKYO" },
      { name: "description", content: "Explore ZANKYO collections: tees, baggy jeans, hoodies, headwear, accessories and footwear." },
      { property: "og:title", content: "Collections — ZANKYO" },
      { property: "og:description", content: "Explore every ZANKYO streetwear collection." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://zankyo.in/collections" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://zankyo.in/collections" }],
  }),
  component: Collections,
});


function Collections() {
  const { data: cats, isLoading } = useCategories();
  const ITEMS = (cats ?? []).map((c) => ({ name: c.name, img: c.image_url }));
  return (
    <div className="zk-hide-vton mx-auto max-w-[1600px] overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="zk-display text-4xl">Collections</h1>
      <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-4 md:grid-cols-3">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-lg bg-card" />)}
        {!isLoading && ITEMS.length === 0 && <p className="col-span-full py-20 text-center text-sm text-muted-foreground">No categories yet</p>}
        {ITEMS.map((c) => (
          <Link
            key={c.name}
            to="/shop"
            search={{ q: undefined, category: c.name }}
            className="group relative block aspect-[4/5] overflow-hidden rounded-lg bg-card"
          >
            {c.img && <img src={c.img} alt={c.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <span className="zk-label absolute inset-x-3 bottom-3 break-words text-[10px] leading-4 text-white sm:inset-x-4 sm:bottom-4 sm:text-sm">{c.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
