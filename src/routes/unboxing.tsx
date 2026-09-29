import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import armorImg from "@/assets/unboxing-01-outer-armor.png.asset.json";
import pouchImg from "@/assets/unboxing-02-pouch.png.asset.json";
import documentImg from "@/assets/unboxing-03-document.png.asset.json";
import keychainImg from "@/assets/unboxing-04-keychain.png.asset.json";
import sequenceImg from "@/assets/unboxing-sequence.png.asset.json";
import unboxingVideo from "@/assets/unboxing-001.mp4.asset.json";
import unboxingPoster from "@/assets/unboxing-001-poster.jpg.asset.json";

export const Route = createFileRoute("/unboxing")({
  head: () => ({
    meta: [
      { title: "UNBOXING // 001 — The ZANKYO Archive Box | ZANKYO" },
      {
        name: "description",
        content:
          "Inside every ZANKYO ARCHIVE 001 box: the matte black outer armor, frosted graphite garment pouch, 400 GSM collector's document and the 3-slash stealth metal keychain. Watch the unboxing.",
      },
      { property: "og:title", content: "UNBOXING // 001 — The ZANKYO Archive Box" },
      {
        property: "og:description",
        content:
          "Matte black archive box, frosted garment pouch, collector's document and a stealth metal keychain with a holder's privilege code.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://zankyo.in/unboxing" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://zankyo.in/unboxing" }],
  }),
  component: UnboxingPage,
});

const ITEMS = [
  {
    index: "01",
    title: "THE OUTER ARMOR",
    subtitle: "(MATTE BLACK ARCHIVE BOX)",
    description:
      "Heavyweight corrugated mailer box finished in scratch-proof matte black lamination, stamped with the metallic silver 3-slash emblem and crimson — 残 響 — seal.",
    image: armorImg.url,
    alt: "ZANKYO matte black archive box with the metallic silver 3-slash emblem and crimson kanji seal",
  },
  {
    index: "02",
    title: "FROSTED GRAPHITE GARMENT POUCH",
    subtitle: "",
    description:
      "Reusable heavy-gauge smoked matte EVA slider zip-lock bag featuring custom air-vent grommets and archival barcode indexing to protect your garment.",
    image: pouchImg.url,
    alt: "ZANKYO frosted graphite garment pouch with archival barcode label",
  },
  {
    index: "03",
    title: "400 GSM BLACK COLLECTOR'S DOCUMENT",
    subtitle: "",
    description:
      "Pitch-black heavyweight cardstock printed in cool-grey monospace ink—certifying your piece as an official ARCHIVE 001 release.",
    image: documentImg.url,
    alt: "ZANKYO black collector's document certifying an official ARCHIVE 001 release",
  },
  {
    index: "04",
    title: "3-SLASH STEALTH METAL KEYCHAIN",
    subtitle: "(HOLDER'S PRIVILEGE)",
    description:
      "Included free inside every box. Custom die-cast matte-black metal keychain molded into the ZANKYO 3-slash silhouette. Flip it over to reveal a laser-engraved private privilege code unlocking an exclusive reward on your next order.",
    image: keychainImg.url,
    alt: "ZANKYO matte black 3-slash metal keychain with engraved privilege code on the reverse",
  },
];

function UnboxingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-[1600px] px-4 py-14 sm:px-6 sm:py-20">
          <p className="zk-label text-[11px] text-white/60">ARCHIVE 001</p>
          <h1 className="zk-display mt-3 text-5xl leading-[0.95] tracking-[0.06em] sm:text-7xl md:text-8xl">
            UNBOXING
            <span className="ml-3 align-middle text-2xl text-accent sm:text-4xl">// 001</span>
          </h1>
          <p className="zk-label mt-4 text-[11px] leading-6 text-white/80">
            More than just clothes
            <br />
            Inside the ZANKYO archive box
          </p>
          <div className="zk-label mt-8 flex items-center gap-4 text-[10px] text-white/50">
            <span className="h-px w-10 bg-white/30" />
            <span>4 ITEMS // FREE KEYCHAIN // HOLDER'S PRIVILEGE</span>
          </div>
        </div>
      </section>

      {/* Video */}
      <section className="bg-ink pb-14 text-white sm:pb-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
            <video
              className="aspect-video h-auto w-full"
              src={unboxingVideo.url}
              poster={unboxingPoster.url}
              controls
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
          </div>
          <p className="zk-label mt-3 text-center text-[10px] text-white/50">
            ARCHIVE 001 // UNBOXING FILM
          </p>
        </div>
      </section>

      {/* The 4 items */}
      <section className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="zk-label text-lg not-italic">THE 4 ITEMS</h2>
        <div className="mt-6 grid gap-4 sm:gap-6 md:grid-cols-2">
          {ITEMS.map((item) => (
            <article
              key={item.index}
              className="overflow-hidden rounded-2xl border border-border bg-ink text-white"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-black">
                <img
                  src={item.image}
                  alt={item.alt}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              <div className="p-6 sm:p-8">
                <p className="zk-label text-[11px] text-white/50">
                  {item.index} //
                </p>
                <h3 className="zk-display mt-2 text-2xl not-italic tracking-[0.08em] sm:text-3xl">
                  {item.title}
                </h3>
                {item.subtitle && (
                  <p className="zk-label mt-1 text-[10px] text-white/60">{item.subtitle}</p>
                )}
                <p className="mt-4 text-sm leading-6 text-white/75">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Unboxing sequence */}
      <section className="mx-auto max-w-[1600px] px-4 pb-12 sm:px-6 sm:pb-16">
        <h2 className="zk-label text-lg not-italic">THE UNBOXING SEQUENCE</h2>
        <div className="mt-6 overflow-hidden rounded-2xl bg-ink">
          <img
            src={sequenceImg.url}
            alt="Four unboxing stages: Stage 1 The Arrival, Stage 2 First Reveal, Stage 3 The Packaging Pouch, Stage 4 The Full Archive"
            loading="lazy"
            className="h-auto w-full object-cover"
          />
        </div>
        <p className="zk-label mt-3 text-[10px] text-muted-foreground">
          STAGE 1 THE ARRIVAL → STAGE 2 FIRST REVEAL → STAGE 3 THE PACKAGING POUCH → STAGE 4 THE FULL ARCHIVE
        </p>
      </section>

      {/* Shop the drop */}
      <section className="border-t border-border bg-ink text-white">
        <div className="mx-auto flex max-w-[1600px] flex-col items-start gap-5 px-4 py-14 sm:px-6 sm:py-16">
          <p className="zk-label text-[11px] text-white/60">ARCHIVE 001</p>
          <h2 className="zk-display text-4xl not-italic tracking-[0.08em] sm:text-5xl">
            EVERY BOX HOLDS A SECRET
          </h2>
          <p className="max-w-xl text-sm leading-6 text-white/70">
            Every ZANKYO order ships in the ARCHIVE 001 box — and every box includes the
            3-slash stealth keychain with your private privilege code.
          </p>
          <Link
            to="/shop"
            search={{ q: undefined, category: undefined }}
            className="zk-label mt-2 inline-flex items-center gap-3 rounded-full border border-white/70 px-7 py-3.5 text-xs text-white transition-colors hover:bg-white hover:text-ink"
          >
            Shop the drop <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
