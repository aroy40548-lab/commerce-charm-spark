import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { buildTryOnPrompt, type TryOnZone } from "@/lib/tryon";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/tryon")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return json({ error: "Please sign in to use AI try-on." }, 401);
        const url = process.env["SUPABASE_URL"]!;
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const sb = createClient(url, key, { auth: { persistSession: false } });
        const { data: u } = await sb.auth.getUser(token);
        if (!u.user) return json({ error: "Please sign in to use AI try-on." }, 401);

        const form = await request.formData();
        const photo = form.get("photo");
        const garment = form.get("garment");
        const zone = (["top", "bottom", "full"].includes(String(form.get("zone"))) ? form.get("zone") : "top") as TryOnZone;
        if (!(photo instanceof File) || !(garment instanceof File)) return json({ error: "Photo missing." }, 400);
        if (photo.size > 10 * 1024 * 1024) return json({ error: "Photo too large (max 10MB)." }, 400);

        const out = new FormData();
        out.set("model", "openai/gpt-image-2.5-sunburst");
        out.set("prompt", buildTryOnPrompt(zone, String(form.get("title") ?? "").slice(0, 120), String(form.get("size") ?? "").slice(0, 20)));
        out.append("image[]", photo);
        out.append("image[]", garment);
        const res = await fetch("https://ai.gateway.lovable.dev/v1/images/edits", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}` },
          body: out,
        });
        if (!res.ok) {
          const t = await res.text();
          console.error("tryon", res.status, t.slice(0, 300));
          const msg = res.status === 429 ? "Busy right now — try again in a minute." : res.status === 402 ? "AI try-on is paused right now." : "Couldn't create the try-on. Try another photo.";
          return json({ error: msg }, res.status);
        }
        const body = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
        const img = body.data?.[0];
        const src = img?.b64_json ? `data:image/png;base64,${img.b64_json}` : img?.url;
        if (!src) return json({ error: "Couldn't create the try-on. Try another photo." }, 502);
        return json({ image: src });
      },
    },
  },
});
