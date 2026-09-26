import { createFileRoute, Link } from "@tanstack/react-router";
import tees from "@/assets/eternal-cross-tee.jpg";
import jeans from "@/assets/distressed-baggy-jeans.jpg";
import hoodie from "@/assets/doom-zip-hoodie.jpg";
import cap from "@/assets/z-star-cap.jpg";
import belt from "@/assets/spiked-belt.jpg";
import shoes from "@/assets/rift-skate-sneakers.jpg";
import jortsImg from "@/assets/cross-stitch-jorts.jpg";
import sweatImg from "@/assets/void-wide-sweatpants.jpg";
import japImg from "@/assets/kyoto-pleated-trousers.jpg";
import boxyImg from "@/assets/flame-boxy-shirt.jpg";

export const Route = createFileRoute("/collections")({
  head: () => ({
    meta: [
      { title: "Collections — ZANKYO" },
      { name: "description", content: "Explore ZANKYO collections: tees, baggy jeans, hoodies, headwear, accessories and footwear." },
      { property: "og:title", content: "Collections — ZANKYO" },
      { property: "og:description", content: "Explore every ZANKYO streetwear collection." },
    ],
  }),
  component: Collections,
});

const ITEMS = [
  { name: "Tees", img: tees },
  { name: "Baggy Jeans", img: jeans },
  { name: "Hoodies", img: hoodie },
  { name: "Headwear", img: cap },
  { name: "Accessories", img: belt },
  { name: "Footwear", img: shoes },
  { name: "Jorts", img: jortsImg },
  { name: "Sweatpants Wide Leg", img: sweatImg },
  { name: "Japanese Trousers", img: japImg },
  { name: "Boxy Shirts", img: boxyImg },
];

function Collections() {
  return (
    <div className="mx-auto max-w-[1600px] overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="zk-display text-4xl">Collections</h1>
      <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-4 md:grid-cols-3">
        {ITEMS.map((c) => (
          <Link
            key={c.name}
            to="/shop"
            search={{ category: c.name }}
            className="group relative block aspect-[4/5] overflow-hidden rounded-lg bg-card"
          >
            <img src={c.img} alt={c.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <span className="zk-label absolute inset-x-3 bottom-3 break-words text-[10px] leading-4 text-white sm:inset-x-4 sm:bottom-4 sm:text-sm">{c.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
