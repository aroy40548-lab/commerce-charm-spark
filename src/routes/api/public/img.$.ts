import { createFileRoute } from "@tanstack/react-router";

// Serves admin-uploaded product photos and files from the private storage bucket.
export const Route = createFileRoute("/api/public/img/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!/^[\w\-./]+$/.test(path) || path.includes("..")) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("product-images").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });
        // Uploads are served from the store's own domain, so never let one run as a page.
        const type = data.type || "application/octet-stream";
        const inline = /^image\/(png|jpe?g|webp|gif|avif)$|^application\/pdf$|^video\/(mp4|webm)$/.test(type);
        return new Response(data, {
          headers: {
            "content-type": inline ? type : "application/octet-stream",
            "content-security-policy": "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox",
            "x-content-type-options": "nosniff",
            ...(inline ? {} : { "content-disposition": "attachment" }),
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
