import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function db() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

export const listPosts = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await db();
  const { data } = await sb.from("blog_posts").select("slug, title, excerpt, cover_url, author, published_at")
    .eq("published", true).order("published_at", { ascending: false }).limit(100);
  return data ?? [];
});

export const getPost = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    const { data: post } = await sb.from("blog_posts").select("*").eq("slug", data.slug).eq("published", true).maybeSingle();
    return post ?? null;
  });
