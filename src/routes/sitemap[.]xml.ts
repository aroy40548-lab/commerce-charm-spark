import { createFileRoute } from "@tanstack/react-router";

const BASE = "https://zankyo.in";
const STATIC = ["/", "/shop", "/collections", "/unboxing", "/about", "/terms", "/returns", "/blog", "/affiliate"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        let paths: string[] = [];
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const [{ data: products }, { data: posts }] = await Promise.all([
            supabaseAdmin.from("products").select("handle").eq("status", "active"),
            supabaseAdmin.from("blog_posts").select("slug").eq("published", true),
          ]);
          paths = [...(products ?? []).map((p) => `/product/${p.handle}`), ...(posts ?? []).map((p) => `/blog/${p.slug}`)];
        } catch {
          paths = [];
        }
        const urls = [...STATIC, ...paths].map((p) => `<url><loc>${BASE}${p}</loc></url>`).join("");
        const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
