import { createFileRoute } from "@tanstack/react-router";
import { storefrontApiRequest } from "@/lib/shopify";

const BASE = "https://zankyo.in";
const STATIC = ["/", "/shop", "/collections", "/about", "/terms", "/returns"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        let handles: string[] = [];
        try {
          const res = await storefrontApiRequest(
            `query { products(first: 250) { edges { node { handle } } } }`,
          );
          handles = (res?.data?.products?.edges ?? []).map((e: any) => e.node.handle);
        } catch {
          handles = [];
        }
        const urls = [...STATIC, ...handles.map((h) => `/product/${h}`)]
          .map((p) => `<url><loc>${BASE}${p}</loc></url>`)
          .join("");
        const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
