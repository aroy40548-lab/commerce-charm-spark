import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Clapperboard, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SignInPanel } from "@/components/SignInPanel";
import { ProductPicker } from "@/components/ProductPicker";
import { useAuth } from "@/hooks/useAuth";
import { MAX_POST_PHOTOS, compressImage, fitPhotos } from "@/lib/social";
import { createPostUploads, publishPost } from "@/lib/social.functions";

export const Route = createFileRoute("/social/new")({
  head: () => ({
    meta: [
      { title: "Create a post — ZANKYO Social" },
      { name: "description", content: "Share up to 10 photos of your ZANKYO fit and tag the products." },
      { property: "og:title", content: "Create a post — ZANKYO Social" },
      { property: "og:description", content: "Share your ZANKYO fit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewPost,
});

function NewPost() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [files, setFiles] = useState<Array<{ file: File; url: string }>>([]);
  const [caption, setCaption] = useState("");
  const [productIds, setProductIds] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  if (loading) return null;
  if (!user) return <div className="mx-auto max-w-md p-6"><SignInPanel /></div>;

  const add = (list: FileList | null) => {
    const picked = [...(list ?? [])].filter((f) => f.type.startsWith("image/"));
    const { accept, dropped } = fitPhotos(files.length, picked.length);
    if (dropped) toast.error(`A post can have at most ${MAX_POST_PHOTOS} photos — ${dropped} not added.`);
    setFiles((cur) => [...cur, ...picked.slice(0, accept).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  };
  const remove = (i: number) => setFiles((cur) => cur.filter((_, j) => j !== i));

  const share = async () => {
    if (!files.length) return;
    try {
      setBusy("Preparing photos…");
      const shrunk = await Promise.all(files.map(async ({ file }) => ({ main: await compressImage(file, 1440), thumb: await compressImage(file, 420, 0.75) })));
      setBusy("Uploading…");
      const slots = await createPostUploads({ data: { count: shrunk.length } });
      await Promise.all(shrunk.flatMap((s, i) => [
        supabase.storage.from("posts").uploadToSignedUrl(slots[i]!.path, slots[i]!.token, s.main.blob, { contentType: "image/webp" }),
        supabase.storage.from("posts").uploadToSignedUrl(slots[i]!.thumbPath, slots[i]!.thumbToken, s.thumb.blob, { contentType: "image/webp" }),
      ]).map(async (p) => { const { error } = await p; if (error) throw new Error("Upload failed — check your connection"); }));
      setBusy("Sharing…");
      const { id } = await publishPost({ data: { photos: shrunk.map((s, i) => ({ path: slots[i]!.path, thumbPath: slots[i]!.thumbPath, w: s.main.width, h: s.main.height })), caption, productIds } });
      qc.invalidateQueries({ queryKey: ["social-feed"] });
      qc.invalidateQueries({ queryKey: ["grid"] });
      toast.success("Posted");
      navigate({ to: "/p/$id", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't post");
    } finally { setBusy(null); }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-5">
      <div className="mb-4 grid grid-cols-2 gap-2">
        <span className="zk-label flex min-h-11 items-center justify-center gap-2 bg-foreground text-xs text-background"><ImagePlus className="h-4 w-4" /> Photo post</span>
        <Link to="/reels/studio" className="zk-label flex min-h-11 items-center justify-center gap-2 border border-border text-xs"><Clapperboard className="h-4 w-4" /> Reel</Link>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {files.map((f, i) => (
          <div key={f.url} className="relative aspect-square overflow-hidden bg-muted">
            <img src={f.url} alt="" className="h-full w-full object-cover" />
            <button onClick={() => remove(i)} aria-label="Remove photo" className="absolute right-1 top-1 grid h-8 w-8 place-items-center bg-ink/70 text-white"><X className="h-4 w-4" /></button>
            {i === 0 && <span className="zk-label absolute bottom-1 left-1 bg-accent px-1.5 py-0.5 text-[9px] text-accent-foreground">Cover</span>}
          </div>
        ))}
        {files.length < MAX_POST_PHOTOS && (
          <label className="grid aspect-square cursor-pointer place-items-center border border-dashed border-border text-center text-xs text-muted-foreground">
            <span><ImagePlus className="mx-auto mb-1 h-6 w-6" />Add photos<br />{files.length}/{MAX_POST_PHOTOS}</span>
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
          </label>
        )}
      </div>

      <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={2200} rows={3} placeholder="Write a caption…" aria-label="Caption" className="mt-4 w-full border border-border bg-background p-3 text-base sm:text-sm" />
      <div className="mt-4"><ProductPicker value={productIds} onChange={setProductIds} /></div>

      <button onClick={share} disabled={!files.length || !!busy} className="zk-label mt-5 flex min-h-12 w-full items-center justify-center gap-2 bg-accent text-xs text-accent-foreground disabled:opacity-40">
        {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> {busy}</> : "Share post"}
      </button>
    </div>
  );
}
