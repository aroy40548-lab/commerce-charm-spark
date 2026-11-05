import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { buildTryOnPrompt, type TryOnZone } from "@/lib/tryon";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function toDataUrl(f: File) {
  const bytes = new Uint8Array(await f.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${f.type || "image/png"};base64,${btoa(bin)}`;
}

export const Route = createFileRoute("/api/tryon")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return json({ error: "Please sign in to use AI try-on." }, 401);
        const sb = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, { auth: { persistSession: false } });
        const { data: u } = await sb.auth.getUser(token);
        if (!u.user) return json({ error: "Please sign in to use AI try-on." }, 401);

        const form = await request.formData();
        const photo = form.get("photo");
        const garment = form.get("garment");
        const zone = (["top", "bottom", "full"].includes(String(form.get("zone"))) ? form.get("zone") : "top") as TryOnZone;
        if (!(photo instanceof File) || !(garment instanceof File)) return json({ error: "Photo missing." }, 400);
        if (photo.size > 10 * 1024 * 1024) return json({ error: "Photo too large (max 10MB)." }, 400);

        const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image",
            modalities: ["image", "text"],
            messages: [{ role: "user", content: [
              { type: "text", text: buildTryOnPrompt(zone, String(form.get("title") ?? "").slice(0, 120), String(form.get("size") ?? "").slice(0, 20)) },
              { type: "image_url", image_url: { url: await toDataUrl(photo) } },
              { type: "image_url", image_url: { url: await toDataUrl(garment) } },
            ] }],
          }),
        });
        if (!res.ok) {
          console.error("tryon", res.status, (await res.text()).slice(0, 300));
          const msg = res.status === 429 ? "Busy right now — try again in a minute." : res.status === 402 ? "AI try-on is paused right now." : "Couldn't create the try-on. Try another photo.";
          return json({ error: msg }, res.status);
        }
        const body = (await res.json()) as { data?: { b64_json?: string; url?: string }[] | null };
        const img = body.data?.[0];
        const src = img?.b64_json ? `data:image/png;base64,${img.b64_json}` : img?.url;
        if (!src) return json({ error: "AI couldn't make this look. Try a clearer full-body photo." }, 502);
        return json({ image: src });
      },
    },
  },
});
