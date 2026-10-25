import { createFileRoute, Link } from "@tanstack/react-router";
import { listPosts } from "@/lib/blog.functions";

export const Route = createFileRoute("/blog/")({
  loader: () => listPosts(),
  head: () => ({
    meta: [
      { title: "Journal — ZANKYO" },
      { name: "description", content: "Drops, styling notes and stories from ZANKYO." },
      { property: "og:title", content: "Journal — ZANKYO" },
    ],
    links: [{ rel: "canonical", href: "https://zankyo.in/blog" }],
  }),
  component: Blog,
});

function Blog() {
  const posts = Route.useLoaderData();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="zk-display text-4xl sm:text-5xl">Journal</h1>
      {posts.length === 0 && <p className="mt-6 text-sm text-muted-foreground">New stories are on the way.</p>}
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {posts.map((p) => (
          <Link key={p.slug} to="/blog/$slug" params={{ slug: p.slug }} className="group block">
            {p.cover_url && (
              <div className="overflow-hidden rounded-xl bg-card">
                <img src={p.cover_url} alt="" loading="lazy" className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">{p.published_at ? new Date(p.published_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : ""}</p>
            <h2 className="mt-1 text-lg font-semibold">{p.title}</h2>
            {p.excerpt && <p className="mt-1 text-sm text-muted-foreground">{p.excerpt}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
