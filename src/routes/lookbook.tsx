import { createFileRoute } from "@tanstack/react-router";
import hero from "@/assets/hero-zankyo.jpg";
import shadows from "@/assets/banner-shadows.jpg";
import genz from "@/assets/banner-genz.jpg";
import texture from "@/assets/cat-texture.jpg";

export const Route = createFileRoute("/lookbook")({
  head: () => ({
    meta: [
      { title: "Lookbook — ZANKYO" },
      { name: "description", content: "The ZANKYO lookbook: dark Y2K streetwear styled on the street." },
      { property: "og:title", content: "Lookbook — ZANKYO" },
      { property: "og:description", content: "Dark Y2K streetwear, styled." },
    ],
  }),
  component: Lookbook,
});

function Lookbook() {
  const shots = [hero, shadows, genz, texture];
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6">
      <h1 className="zk-display text-4xl">Lookbook</h1>
      <p className="mt-2 text-sm text-muted-foreground">Season drop — worn on concrete.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {shots.map((s, i) => (
          <img key={i} src={s} alt={`Lookbook shot ${i + 1}`} loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover object-top" />
        ))}
      </div>
    </div>
  );
}
