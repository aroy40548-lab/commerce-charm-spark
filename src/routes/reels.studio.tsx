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
import { formatMoney } from "@/lib/catalog";
import { MAX_REEL_BYTES, MAX_REEL_SECONDS, REEL_TYPES, readVideoDuration, reelLengthOk, reelLink } from "@/lib/reels";
import { createReelUpload, deleteMyReel, listMyReels, publishReel, updateMyReel } from "@/lib/reels.functions";

export const Route = createFileRoute("/reels/studio")({
  ssr: false,
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

function ProductPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const products = useProducts();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const all = (products.data ?? []).map((p) => p.node);
    const s = q.trim().toLowerCase();
    return (s ? all.filter((p) => p.title.toLowerCase().includes(s)) : all).slice(0, 30);
  }, [products.data, q]);
  const byId = new Map((products.data ?? []).map((p) => [p.node.id, p.node]));
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : value.length >= 5 ? value : [...value, id]);

  return (
    <div>
      <p className="zk-label text-[11px] text-muted-foreground">Tag products ({value.length}/5)</p>
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {value.map((id) => (
            <button key={id} type="button" onClick={() => toggle(id)} className="flex items-center gap-1 bg-foreground px-2 py-1 text-xs text-background">
              {byId.get(id)?.title ?? "Product"} <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products to tag" className="mt-2 min-h-11 w-full border border-border bg-background px-3 text-base sm:text-sm" />
      <div className="mt-2 max-h-56 overflow-y-auto border border-border">
        {list.map((p) => {
          const on = value.includes(p.id);
          return (
            <button key={p.id} type="button" onClick={() => toggle(p.id)} className={`flex w-full items-center gap-3 border-b border-border p-2 text-left last:border-0 ${on ? "bg-muted" : ""}`}>
              <div className="h-10 w-10 shrink-0 overflow-hidden bg-muted">{p.images.edges[0] && <img src={p.images.edges[0].node.url} alt="" className="h-full w-full object-cover" />}</div>
              <span className="min-w-0 flex-1 truncate text-sm">{p.title}</span>
              <span className="text-xs text-muted-foreground">{formatMoney(p.priceRange.minVariantPrice.amount)}</span>
              {on && <Check className="h-4 w-4" />}
            </button>
          );
        })}
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

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (!(REEL_TYPES as readonly string[]).includes(f.type)) { toast.error("Use an MP4, MOV or WebM video"); return; }
    if (f.size > MAX_REEL_BYTES) { toast.error("Video is too large (max 50MB)"); return; }
    try {
      const d = await readVideoDuration(f);
      if (!reelLengthOk(d)) { toast.error(`Reels must be ${MAX_REEL_SECONDS} seconds or shorter (this one is ${Math.round(d)}s)`); return; }
      setDuration(d);
      setFile(f);
      setPreview(URL.createObjectURL(f));
    } catch {
      toast.error("Couldn't read this video. Try an MP4.");
    }
  };

  const publish = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const { path, token } = await createReelUpload({ data: { type: file.type as (typeof REEL_TYPES)[number], size: file.size, duration } });
      const { error } = await supabase.storage.from("reels").uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (error) throw new Error("Upload failed — check your connection");
      await publishReel({ data: { path, caption, duration, productIds } });
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
      {!file ? (
        <label className="mt-3 flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border text-sm text-muted-foreground hover:bg-muted">
          <Upload className="h-6 w-6" />
          Choose a video (under {MAX_REEL_SECONDS}s, max 50MB)
          <input type="file" accept="video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
        </label>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-[180px_1fr]">
          <div className="relative">
            {preview && <video src={preview} muted loop autoPlay playsInline className="aspect-[9/16] w-full bg-ink object-cover" />}
            <p className="mt-1 text-xs text-muted-foreground">{Math.round(duration)}s · {(file.size / 1024 / 1024).toFixed(1)}MB</p>
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
