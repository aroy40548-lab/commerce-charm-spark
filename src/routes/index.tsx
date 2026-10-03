import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft, Crosshair } from "lucide-react";
import { useCategories, useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/ProductCard";
import { ZankyoStar } from "@/components/ZankyoStar";
import heroVideo from "@/assets/hero-bg.mp4.asset.json";
import heroPoster from "@/assets/hero-bg-poster.jpg.asset.json";
import shadowsImg from "@/assets/banner-shadows.jpg";
import genzImg from "@/assets/banner-genz.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZANKYO | Official Streetwear Store India — Jorts, Wide Leg Sweatpants, Boxy Shirts" },
      {
        name: "description",
        content:
          "Zankyo official store (zankyo.in): Indian Gen Z streetwear — graphic tees, baggy jeans, jorts, wide leg sweatpants, Japanese trousers and boxy shirts. Shop ZANKYO online.",
      },
      { property: "og:title", content: "ZANKYO | Official Streetwear Store India" },
      {
        property: "og:description",
        content: "Zankyo official store: graphic tees, baggy denim, jorts and boxy shirts. Wear your story.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://zankyo.in/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://zankyo.in/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "ZANKYO",
            alternateName: ["Zankyo", "ZANKYO ONLINE SHOPPING"],
            url: "https://zankyo.in/",
            logo: "https://zankyo.in/favicon.png",
            email: "help@zankyo.in",
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "ZANKYO",
            alternateName: "Zankyo",
            url: "https://zankyo.in/",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://zankyo.in/shop?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          },
        ]),
      },
    ],
  }),
  component: Home,
});


function Home() {
  const { data: products, isLoading } = useProducts();
  const { data: cats, isLoading: catsLoading } = useCategories();

  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-ink">
        <video
          src={heroVideo.url}
          poster={heroPoster.url}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          controlsList="nodownload noplaybackrate"
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-top opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-black/20" />
        <div className="relative mx-auto flex min-h-[min(36rem,75svh)] max-w-[1600px] flex-col justify-center px-4 py-12 sm:min-h-[600px] sm:px-6 sm:py-16 md:min-h-[640px] lg:min-h-[720px]">
          <p className="zk-label text-[11px] text-white/70">Streetwear</p>
          <h1 className="zk-display mt-2 flex min-w-0 items-center gap-3 text-5xl text-white sm:gap-4 sm:text-7xl md:text-8xl">
            <img
              src="/favicon.png"
              alt=""
              width={64}
              height={64}
              className="h-10 w-10 shrink-0 invert mix-blend-screen sm:h-14 sm:w-14 md:h-16 md:w-16"
            />
            <span>ZANKYO</span>
          </h1>
          <p className="zk-label mt-3 text-[11px] leading-6 text-white/80">
            More than just clothes
            <br />
            Built for a different generation
          </p>
          <Link
            to="/shop"
            search={{ q: undefined, category: undefined }}
            className="zk-label mt-7 inline-flex w-fit items-center gap-3 rounded-full border border-white/70 bg-black/30 px-7 py-3.5 text-xs text-white backdrop-blur transition-colors hover:bg-white hover:text-ink"
          >
            Shop now <ArrowRight className="h-4 w-4" />
          </Link>

          <div className="mt-12 flex items-center gap-3 text-white/80">
            <Crosshair className="h-7 w-7" strokeWidth={1} />
            <span className="zk-label text-[10px] leading-4">
              Wear
              <br />
              your story
            </span>
          </div>

          <p className="zk-display absolute right-6 top-10 hidden -rotate-6 text-2xl leading-7 text-white/90 lg:block">
            Gen Z
            <br />
            vibes
            <br />
            worldwide
          </p>
          <div className="absolute bottom-6 right-6 hidden items-center gap-4 text-xs text-white/60 md:flex">
            <span>—</span>
            <span className="text-white">01</span>
            <span>02</span>
            <span>03</span>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-5">
          {catsLoading && Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-card sm:h-36" />
          ))}
          {(cats ?? []).map((c) => ({ label: c.name, image: c.image_url })).map((cat) => (
            <Link
              key={cat.label}
              to="/shop"
              search={{ q: undefined, category: cat.label }}
              className="group relative h-32 overflow-hidden rounded-lg bg-ink sm:h-36"
            >
              {cat.image && <img
                src={cat.image}
                alt={cat.label}
                loading="lazy"
                className="absolute inset-0 h-full w-full scale-150 object-cover opacity-70 transition-transform duration-500 group-hover:scale-[1.7]"
              />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/10" />
               <span className="zk-label absolute bottom-3 left-3 max-w-[calc(100%-3.5rem)] break-words text-[10px] leading-4 text-white sm:bottom-4 sm:left-4 sm:text-xs">{cat.label}</span>
              <span className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full border border-white/70 text-white">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* New arrivals */}
      <section className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2">
            <ZankyoStar className="h-4 w-4" />
            <span className="zk-label text-lg not-italic">New Arrivals</span>
          </h2>
          <Link
            to="/shop"
            search={{ q: undefined, category: undefined }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 sm:gap-y-8 md:grid-cols-4 xl:grid-cols-8">
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-xl bg-card" />
            ))}
          {products?.map((product) => <ProductCard key={product.node.id} product={product} />)}
        </div>
        {!isLoading && products?.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">No products found</p>
        )}
      </section>

      {/* Editorial banners */}
      <section className="zk-hide-vton mx-auto grid max-w-[1600px] gap-4 px-4 pb-4 sm:px-6 md:grid-cols-2">
        <div className="relative h-72 overflow-hidden rounded-2xl bg-ink md:h-80">
          <img src={shadowsImg} alt="Shadows collection" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
          <div className="relative flex h-full flex-col justify-end p-8">
            <p className="zk-label text-[10px] text-white/60">Collection</p>
            <h2 className="zk-display mt-1 text-4xl not-italic tracking-[0.12em] text-white">SHADOWS</h2>
            <p className="zk-label mt-2 text-[10px] leading-5 text-white/70">
              Raw details.
              <br />
              Bigger stories.
            </p>
            <Link
              to="/collections"
              className="zk-label mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/70 px-6 py-3 text-[11px] text-white hover:bg-white hover:text-ink"
            >
              Explore <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="relative h-72 overflow-hidden rounded-2xl bg-ink md:h-80">
          <img src={genzImg} alt="Gen Z lookbook" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-85" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
          <div className="relative flex h-full flex-col justify-end p-8">
            <p className="zk-label text-[10px] text-white/60">New drop</p>
            <h2 className="zk-display mt-1 text-4xl not-italic tracking-[0.12em] text-white">GEN Z</h2>
            <p className="zk-label mt-2 text-[10px] leading-5 text-white/70">
              Real people.
              <br />
              Real outfits.
            </p>
            <Link
              to="/shop"
              className="zk-label mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/70 px-6 py-3 text-[11px] text-white hover:bg-white hover:text-ink"
            >
              Shop the drop <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="absolute bottom-6 right-6 flex gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink">
              <ArrowLeft className="h-4 w-4" />
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink">
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
