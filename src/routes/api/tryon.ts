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

        const prompt = buildTryOnPrompt(zone, String(form.get("title") ?? "").slice(0, 120), String(form.get("size") ?? "").slice(0, 20));
        const photoUrl = await toDataUrl(photo);
        const garmentUrl = await toDataUrl(garment);
        let src: string | undefined;
        const gKey = process.env["GEMINI_API_KEY"];
        if (gKey) {
          const part = (u: string) => { const [h, d] = u.split(","); return { inline_data: { mime_type: h!.slice(5, h!.indexOf(";")), data: d } }; };
          const g = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent", {
            method: "POST",
            headers: { "x-goog-api-key": gKey, "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, part(photoUrl), part(garmentUrl)] }], generationConfig: { responseModalities: ["IMAGE", "TEXT"] } }),
          });
          if (g.ok) {
            const gb = (await g.json()) as { candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[] };
            const img = gb.candidates?.[0]?.content?.parts?.find((x) => x.inlineData?.data)?.inlineData;
            if (img?.data) src = `data:${img.mimeType ?? "image/png"};base64,${img.data}`;
          } else console.error("tryon gemini", g.status, (await g.text()).slice(0, 300));
        }
        if (!src) {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image",
            modalities: ["image", "text"],
            messages: [{ role: "user", content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: photoUrl } },
              { type: "image_url", image_url: { url: garmentUrl } },
            ] }],
          }),
        });
        if (!res.ok) {
          console.error("tryon", res.status, (await res.text()).slice(0, 300));
          const msg = res.status === 429 ? "Busy right now — try again in a minute." : res.status === 402 ? "AI fitting is temporarily unavailable. Please try again later." : "Couldn't create the try-on. Try another photo.";
          return json({ error: msg }, res.status);
        }
        const body = (await res.json()) as { data?: { b64_json?: string; url?: string }[] | null };
        const img = body.data?.[0];
        src = img?.b64_json ? `data:image/png;base64,${img.b64_json}` : img?.url;
        }
        if (!src) return json({ error: "AI couldn't make this look. Try a clearer full-body photo." }, 502);
        return json({ image: src });
      },
    },
  },
});
