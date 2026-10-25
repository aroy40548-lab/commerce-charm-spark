import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star, BadgeCheck, Loader2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { deleteMyReview, getProductReviews, getReviewEligibility, submitReview } from "@/lib/reviews.functions";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: size, height: size }} className={i <= Math.round(value) ? "fill-accent text-accent" : "text-muted-foreground/40"} />
      ))}
    </span>
  );
}

export function ProductReviews({ handle }: { handle: string }) {
  const fetchReviews = useServerFn(getProductReviews);
  const q = useQuery({ queryKey: ["reviews", handle], queryFn: () => fetchReviews({ data: { handle } }) });
  const signedIn = !!useAuth().user;
  const [open, setOpen] = useState(false);

  const d = q.data;
  return (
    <section id="reviews" className="mt-14 scroll-mt-24 sm:mt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="zk-label text-sm">Reviews</h2>
          {d && d.count > 0 && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Stars value={d.average} size={16} />
              <span className="font-semibold">{d.average.toFixed(1)}</span>
              <span className="text-muted-foreground">({d.count})</span>
            </div>
          )}
        </div>
        {!open &&
          (signedIn ? (
            <button onClick={() => setOpen(true)} className="zk-label min-h-11 rounded-full border border-foreground px-5 text-xs">
              Write a review
            </button>
          ) : (
            <Link to="/auth" search={{ next: `/product/${handle}#reviews` }} className="zk-label inline-flex min-h-11 items-center rounded-full border border-foreground px-5 text-xs">
              Sign in to review
            </Link>
          ))}
      </div>

      {open && signedIn && <ReviewForm handle={handle} onClose={() => setOpen(false)} />}

      <div className="mt-6 space-y-4">
        {q.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        {d && d.count === 0 && <p className="text-sm text-muted-foreground">No reviews yet. Bought this? Be the first.</p>}
        {d?.reviews.map((r) => (
          <article key={r.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Stars value={r.rating} />
              <span className="text-sm font-semibold">{r.name}</span>
              {r.verified && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified buyer
                </span>
              )}
              <span className="ml-auto text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span>
            </div>
            {r.title && <h3 className="mt-2 text-sm font-semibold">{r.title}</h3>}
            {r.body && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{r.body}</p>}
            {r.pictures.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {r.pictures.map((src) => (
                  <a key={src} href={src} target="_blank" rel="noreferrer">
                    <img src={src} alt="Customer photo" loading="lazy" className="h-20 w-20 rounded-md object-cover" />
                  </a>
                ))}
              </div>
            )}
            {r.reply && (
              <div className="mt-3 rounded-md bg-muted/70 px-3 py-2 text-sm">
                <span className="zk-label text-[10px]">ZANKYO replied</span>
                <p className="mt-1 whitespace-pre-line text-muted-foreground">{r.reply}</p>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function ReviewForm({ handle, onClose }: { handle: string; onClose: () => void }) {
  const qc = useQueryClient();
  const checkFn = useServerFn(getReviewEligibility);
  const submitFn = useServerFn(submitReview);
  const deleteFn = useServerFn(deleteMyReview);
  const elig = useQuery({
    queryKey: ["review-eligibility", handle],
    queryFn: () => checkFn({ data: { handle } }),
  });
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ex = elig.data?.status === "eligible" ? elig.data.existing : null;
    if (ex) {
      setRating(ex.rating);
      setTitle(ex.title ?? "");
      setBody(ex.body);
    }
  }, [elig.data]);

  const addFiles = (list: FileList | null) => {
    const next = [...files];
    for (const f of Array.from(list ?? [])) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) { toast.error("Photos must be JPG, PNG or WebP"); continue; }
      if (f.size > 5 * 1024 * 1024) { toast.error("Each photo must be under 5MB"); continue; }
      if (next.length < 5) next.push(f);
    }
    setFiles(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const images = await Promise.all(files.map(async (f) => ({ type: f.type as "image/jpeg", base64: await toBase64(f) })));
      await submitFn({ data: { handle, rating, title, body, images } });
      toast.success("Thanks! Your review was posted.", { position: "top-center" });
      qc.invalidateQueries({ queryKey: ["reviews", handle] });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't post your review", { position: "top-center" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Delete your review?")) return;
    setBusy(true);
    try {
      await deleteFn({ data: { handle } });
      toast.success("Review deleted", { position: "top-center" });
      qc.invalidateQueries({ queryKey: ["reviews", handle] });
      qc.invalidateQueries({ queryKey: ["review-eligibility", handle] });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete", { position: "top-center" });
    } finally {
      setBusy(false);
    }
  };

  const box = "mt-6 rounded-lg border border-border p-4 sm:p-6";
  if (elig.isLoading) return <div className={box}><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (elig.isError) {
    return (
      <div className={`${box} flex flex-wrap items-center justify-between gap-3`}>
        <p className="text-sm text-muted-foreground">{elig.error instanceof Error ? elig.error.message : "Couldn't check your orders, try again."}</p>
        <div className="flex items-center gap-1">
          <button onClick={() => elig.refetch()} className="zk-label min-h-11 rounded-full border border-foreground px-4 text-xs">Retry</button>
          <button onClick={onClose} aria-label="Close" className="grid h-11 w-11 place-items-center"><X className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }
  const status = elig.data?.status;
  const existing = elig.data?.status === "eligible" ? elig.data.existing : null;
  if (status !== "eligible") {
    const msg =
      status === "not_purchased" ? "Only customers who bought this can review it." :
      "Reviews aren't available for this product right now.";
    return (
      <div className={`${box} flex items-center justify-between gap-3`}>
        <p className="text-sm text-muted-foreground">{msg}</p>
        <button onClick={onClose} aria-label="Close" className="grid h-11 w-11 place-items-center"><X className="h-4 w-4" /></button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`${box} space-y-4`}>
      <p className="text-sm text-muted-foreground">Reviewing as <span className="text-foreground">{elig.data?.name}</span></p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button type="button" key={i} onClick={() => setRating(i)} aria-label={`${i} stars`} className="grid h-11 w-11 place-items-center">
            <Star className={`h-6 w-6 ${i <= rating ? "fill-accent text-accent" : "text-muted-foreground/40"}`} />
          </button>
        ))}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Title (optional)" className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} required minLength={3} maxLength={2000} rows={4} placeholder="How's the fit, fabric, vibe?" className="w-full rounded-lg border border-border bg-background p-3 text-sm" />
      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => (
          <div key={i} className="relative">
            <img src={URL.createObjectURL(f)} alt="" className="h-20 w-20 rounded-md object-cover" />
            <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="Remove photo" className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-foreground text-background"><X className="h-3 w-3" /></button>
          </div>
        ))}
        {files.length < 5 && (
          <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-md border border-dashed border-border text-muted-foreground">
            <ImagePlus className="h-5 w-5" />
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
          </label>
        )}
      </div>
      <div className="flex gap-2">
        <button disabled={busy} className="zk-label flex min-h-12 flex-1 items-center justify-center rounded-full bg-foreground text-xs text-background disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : existing ? "Update review" : "Post review"}
        </button>
        <button type="button" onClick={onClose} className="zk-label min-h-12 rounded-full border border-border px-5 text-xs">Cancel</button>
      </div>
      {existing && (
        <button type="button" onClick={remove} disabled={busy} className="min-h-11 text-sm text-destructive underline underline-offset-2">
          Delete my review
        </button>
      )}
      {existing && files.length === 0 && <p className="text-xs text-muted-foreground">Adding new photos replaces your old ones.</p>}
    </form>
  );
}
