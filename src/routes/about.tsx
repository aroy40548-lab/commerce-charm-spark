import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — ZANKYO" },
      { name: "description", content: "ZANKYO is streetwear built for a different generation. More than just clothes." },
      { property: "og:title", content: "About — ZANKYO" },
      { property: "og:description", content: "Streetwear built for a different generation." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="zk-label text-xs text-muted-foreground">About</p>
      <h1 className="zk-display mt-2 text-5xl">More than just clothes.</h1>
      <div className="mt-8 space-y-4 text-muted-foreground">
        <p>ZANKYO is streetwear built for a different generation — heavyweight graphic tees, baggy washed denim and oversized hoodies with a dark, Y2K edge.</p>
        <p>Every piece is designed to be lived in and worn loud. Wear your story.</p>
        <p>Questions about an order? Reply to your order confirmation email and our team will help.</p>
      </div>
      <Link to="/shop" className="zk-label mt-10 inline-flex rounded-full bg-foreground px-6 py-3 text-xs text-background">
        Shop now
      </Link>
    </div>
  );
}
