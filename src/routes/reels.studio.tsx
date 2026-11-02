import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Eye, Loader2, Share2, ThumbsUp, Trash2, Upload, X, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SignInPanel } from "@/components/SignInPanel";
import { useAuth } from "@/hooks/useAuth";
import { useMyProfile } from "@/components/ProfileEditor";
import { useProducts } from "@/hooks/useProducts";
import { ProductPicker } from "@/components/ProductPicker";
import { formatMoney } from "@/lib/catalog";
import { MAX_REEL_BYTES, MAX_REEL_SECONDS, REEL_TYPES, readVideoDuration, reelLengthOk, reelLink } from "@/lib/reels";
import { createReelUpload, deleteMyReel, getReelSound, listMyReels, publishReel, updateMyReel } from "@/lib/reels.functions";
import { VideoTrimmer } from "@/components/reels/VideoTrimmer";
import { z } from "zod";

export const Route = createFileRoute("/reels/studio")({
  ssr: false,
  validateSearch: (s) => z.object({ sound: z.string().uuid().optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "Reel studio — post your ZANKYO fit" },
      { name: "description", content: "Upload a ZANKYO reel under 59 seconds, tag the products and earn when people buy." },
      { property: "og:title", content: "ZANKYO Reel studio" },
      { property: "og:description", content: "Post your ZANKYO fit and earn on every sale." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Studio,
});

function Studio() {
  const { user, loading } = useAuth();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:pt-10">
      <Link to="/reels" className="zk-label inline-flex min-h-10 items-center gap-2 text-[11px] text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Back to reels</Link>
      <h1 className="zk-display mt-2 text-4xl sm:text-5xl">Reel studio</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Post your ZANKYO fit (max {MAX_REEL_SECONDS} seconds), tag the pieces you're wearing, and earn commission when someone buys through your reel. Your @username is shown — never your email.
      </p>
      <div className="mt-6">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : !user ? (
          <div className="max-w-md border border-border p-5"><p className="mb-4 text-sm font-semibold">Sign in to post reels</p><SignInPanel /></div>
        ) : (
          <>
            <MyProfileLink />
            <Uploader />
            <MyReels />
          </>
        )}
      </div>
    </div>
  );
}

function Uploader() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [productIds, setProductIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [trim, setTrim] = useState<[number, number]>([0, 0]);
  const { sound: soundId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const sound = useQuery({ queryKey: ["reel-sound", soundId], enabled: !!soundId, queryFn: () => getReelSound({ data: { id: soundId! } }) });
  const clip = Math.max(0, trim[1] - trim[0]);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (!(REEL_TYPES as readonly string[]).includes(f.type)) { toast.error("Use an MP4, MOV or WebM video"); return; }
    if (f.size > MAX_REEL_BYTES) { toast.error("Video is too large (max 50MB)"); return; }
    try {
      const d = await readVideoDuration(f);
      if (!Number.isFinite(d) || d <= 0 || d > 600) { toast.error("Video must be under 10 minutes — you'll trim it to 59s"); return; }
      setDuration(d);
      setTrim([0, Math.min(d, MAX_REEL_SECONDS)]);
      setFile(f);
      setPreview(URL.createObjectURL(f));
    } catch {
      toast.error("Couldn't read this video. Try an MP4.");
    }
  };

  const publish = async () => {
    if (!file) return;
    if (!reelLengthOk(clip)) { toast.error(`Trim your clip to ${MAX_REEL_SECONDS} seconds or less`); return; }
    setBusy(true);
    try {
      const { path, token } = await createReelUpload({ data: { type: file.type as (typeof REEL_TYPES)[number], size: file.size, duration: clip } });
      const { error } = await supabase.storage.from("reels").uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (error) throw new Error("Upload failed — check your connection");
      await publishReel({ data: { path, caption, duration: clip, productIds, trimStart: trim[0], trimEnd: trim[1] < duration - 0.1 ? trim[1] : null, soundReelId: sound.data?.reelId ?? null } });
      if (soundId) void navigate({ search: {} });
      toast.success("Your reel is live!");
      setFile(null); setPreview(null); setCaption(""); setProductIds([]);
      qc.invalidateQueries({ queryKey: ["my-reels"] });
      qc.invalidateQueries({ queryKey: ["reels"] });
      qc.invalidateQueries({ queryKey: ["my-affiliate"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't publish");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border border-foreground p-4 sm:p-5">
      <p className="zk-label text-[11px]">New reel</p>
      {soundId && (
        <div className="mt-3 flex items-center justify-between gap-2 border border-accent/50 bg-accent/10 px-3 py-2 text-sm">
          <span className="truncate">{sound.isLoading ? "Loading sound…" : sound.data ? `🎵 Using sound by @${sound.data.by}` : "This sound isn't available"}</span>
          <button type="button" onClick={() => void navigate({ search: {} })} aria-label="Remove sound" className="grid h-8 w-8 place-items-center"><X className="h-4 w-4" /></button>
        </div>
      )}
      {!file ? (
        <label className="mt-3 flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border text-sm text-muted-foreground hover:bg-muted">
          <Upload className="h-6 w-6" />
          Choose a video (max 50MB) — trim it to {MAX_REEL_SECONDS}s next
          <input type="file" accept="video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
        </label>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-[180px_1fr]">
          <div className="relative">
            {preview && <VideoTrimmer src={preview} duration={duration} max={MAX_REEL_SECONDS} value={trim} onChange={setTrim} soundUrl={sound.data?.url || null} />}
            <p className="mt-1 text-xs text-muted-foreground">Clip {clip.toFixed(1)}s · {(file.size / 1024 / 1024).toFixed(1)}MB</p>
            <button type="button" onClick={() => { setFile(null); setPreview(null); }} className="mt-1 text-xs underline">Choose another</button>
          </div>
          <div className="space-y-4">
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={300} rows={3} placeholder="Caption" aria-label="Caption" className="w-full border border-border bg-background p-3 text-base sm:text-sm" />
            <ProductPicker value={productIds} onChange={setProductIds} />
            <button onClick={publish} disabled={busy} className="zk-label flex min-h-12 w-full items-center justify-center gap-2 bg-foreground text-xs text-background disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} {busy ? "Uploading…" : "Publish reel"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function MyReels() {
  const qc = useQueryClient();
  const mine = useQuery({ queryKey: ["my-reels"], queryFn: () => listMyReels() });
  const [editing, setEditing] = useState<{ id: string; caption: string; productIds: string[] } | null>(null);

  const remove = async (id: string) => {
    if (!confirm("Delete this reel?")) return;
    await deleteMyReel({ data: { id } });
    qc.invalidateQueries({ queryKey: ["my-reels"] });
  };
  const save = async () => {
    if (!editing) return;
    await updateMyReel({ data: editing });
    setEditing(null);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["my-reels"] });
  };
  const share = async (id: string, code: string | null) => {
    const link = reelLink(window.location.origin, id, code);
    try { if (navigator.share) await navigator.share({ url: link }); else { await navigator.clipboard.writeText(link); toast.success("Link copied"); } } catch { /* cancelled */ }
  };

  return (
    <section className="mt-8">
      <p className="zk-label text-[11px] text-muted-foreground">My reels</p>
      {mine.isLoading && <Loader2 className="mt-3 h-5 w-5 animate-spin" />}
      {mine.data?.length === 0 && <p className="mt-3 text-sm text-muted-foreground">You haven't posted any reels yet.</p>}
      <ul className="mt-3 space-y-3">
        {mine.data?.map((r) => (
          <li key={r.id} className="border border-border p-3">
            <div className="flex gap-3">
              <video src={r.videoUrl} muted playsInline preload="metadata" className="aspect-[9/16] w-20 shrink-0 bg-ink object-cover" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm">{r.caption || <span className="text-muted-foreground">No caption</span>}</p>
                {r.hidden && <p className="mt-1 text-xs text-destructive">Hidden by ZANKYO</p>}
                <p className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{r.views}</span>
                  <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{r.likes}</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{r.comments}</span>
                  <span>Earned {formatMoney(r.earned)}</span>
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{r.products.map((p) => p.title).join(", ") || "No products tagged"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => share(r.id, r.creatorCode)} className="zk-label inline-flex min-h-9 items-center gap-1 border border-border px-3 text-[10px]"><Share2 className="h-3 w-3" /> Share</button>
                  <button onClick={() => setEditing({ id: r.id, caption: r.caption, productIds: r.products.map((p) => p.id) })} className="zk-label min-h-9 border border-border px-3 text-[10px]">Edit</button>
                  <button onClick={() => remove(r.id)} aria-label="Delete reel" className="grid h-9 w-9 place-items-center border border-border text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
            {editing?.id === r.id && (
              <div className="mt-3 space-y-3 border-t border-border pt-3">
                <textarea value={editing.caption} onChange={(e) => setEditing({ ...editing, caption: e.target.value })} maxLength={300} rows={2} aria-label="Caption" className="w-full border border-border bg-background p-2 text-base sm:text-sm" />
                <ProductPicker value={editing.productIds} onChange={(productIds) => setEditing({ ...editing, productIds })} />
                <div className="flex gap-2">
                  <button onClick={save} className="zk-label min-h-10 bg-foreground px-5 text-[11px] text-background">Save</button>
                  <button onClick={() => setEditing(null)} className="zk-label min-h-10 border border-border px-5 text-[11px]">Cancel</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function MyProfileLink() {
  const me = useMyProfile();
  if (!me.data?.username) return null;
  return (
    <Link to="/u/$username" params={{ username: me.data.username }} className="zk-label mb-5 inline-flex min-h-11 items-center gap-2 border border-foreground px-5 text-xs">
      My profile · @{me.data.username}
    </Link>
  );
}
