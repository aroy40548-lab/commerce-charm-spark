import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getPost } from "@/lib/blog.functions";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await getPost({ data: { slug: params.slug } });
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData, params }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Journal"} — ZANKYO` },
      { name: "description", content: loaderData?.excerpt || "From the ZANKYO journal." },
      { property: "og:title", content: loaderData?.title ?? "ZANKYO Journal" },
      { property: "og:type", content: "article" },
      ...(loaderData?.cover_url ? [{ property: "og:image", content: loaderData.cover_url }] : []),
    ],
    links: [{ rel: "canonical", href: `https://zankyo.in/blog/${params.slug}` }],
  }),
  component: Post,
});

function Post() {
  const p = Route.useLoaderData();
  return (
    <article className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <Link to="/blog" className="text-sm text-muted-foreground underline underline-offset-4">← Journal</Link>
      <h1 className="zk-display mt-4 text-4xl leading-tight sm:text-5xl">{p.title}</h1>
      <p className="mt-3 text-xs text-muted-foreground">
        {p.author} · {p.published_at ? new Date(p.published_at).toLocaleDateString("en-IN", { dateStyle: "long" }) : ""}
      </p>
      {p.cover_url && <img src={p.cover_url} alt="" className="mt-6 w-full rounded-xl object-cover" />}
      <div className="mt-6 space-y-4 text-[15px] leading-7">
        {p.body.split(/\n{2,}/).map((para, i) => (
          <p key={i} className="whitespace-pre-line">{para}</p>
        ))}
      </div>
    </article>
  );
}
