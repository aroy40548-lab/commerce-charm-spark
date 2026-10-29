import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star, BadgeCheck, Loader2, ImagePlus, X, ArrowLeft, ChevronLeft, ChevronRight, ThumbsUp, MessageCircle, Pencil } from "lucide-react";
import { VerifiedTick } from "@/components/social/Verified";
import { toast } from "sonner";
import { deleteMyReview, deleteReviewReply, getProductReviews, getReviewEligibility, myReviewLikes, replyToReview, submitReview, toggleReviewLike, type PublicReview } from "@/lib/reviews.functions";
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
  const likesFn = useServerFn(myReviewLikes);
  const ids = q.data?.reviews.map((r) => r.id) ?? [];
  const likesQ = useQuery({ queryKey: ["review-likes", handle, ids.length], enabled: signedIn && ids.length > 0, queryFn: () => likesFn({ data: { ids } }) });
  const liked = new Set(likesQ.data ?? []);
  useEffect(() => {
    if (!q.data || !window.location.hash.startsWith("#review-")) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [q.data]);

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
        {d && d.count === 0 && <p className="text-sm text-muted-foreground">No reviews yet. Got your order delivered? Be the first.</p>}
        {d?.reviews.map((r) => <ReviewCard key={r.id} r={r} handle={handle} liked={liked.has(r.id)} onEdit={() => { setOpen(true); document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" }); }} />)}
      </div>
    </section>
  );
}

function Lightbox({ pics, start, onClose }: { pics: string[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") setI((x) => Math.min(pics.length - 1, x + 1)); if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1)); };
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [pics.length, onClose]);
  let x0 = 0;
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-3 py-2">
        <button onClick={onClose} aria-label="Back" className="grid h-11 w-11 place-items-center"><ArrowLeft className="h-5 w-5" /></button>
        <span className="text-sm text-muted-foreground">{i + 1} / {pics.length}</span>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden"
        onTouchStart={(e) => { x0 = e.touches[0]!.clientX; }}
        onTouchEnd={(e) => { const dx = e.changedTouches[0]!.clientX - x0; if (dx < -40) setI((x) => Math.min(pics.length - 1, x + 1)); if (dx > 40) setI((x) => Math.max(0, x - 1)); }}>
        <img src={pics[i]} alt="Customer photo" className="max-h-full max-w-full object-contain" />
        {i > 0 && <button onClick={() => setI(i - 1)} aria-label="Previous" className="absolute left-2 grid h-11 w-11 place-items-center rounded-full bg-background/80"><ChevronLeft className="h-5 w-5" /></button>}
        {i < pics.length - 1 && <button onClick={() => setI(i + 1)} aria-label="Next" className="absolute right-2 grid h-11 w-11 place-items-center rounded-full bg-background/80"><ChevronRight className="h-5 w-5" /></button>}
      </div>
      {pics.length > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto p-3">
          {pics.map((p, j) => <button key={p} onClick={() => setI(j)} className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 ${j === i ? "border-accent" : "border-transparent"}`}><img src={p} alt="" className="h-full w-full object-cover" /></button>)}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ r, handle, liked, onEdit }: { r: PublicReview; handle: string; liked: boolean; onEdit: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const likeFn = useServerFn(toggleReviewLike);
  const replyFn = useServerFn(replyToReview);
  const delReplyFn = useServerFn(deleteReviewReply);
  const [pic, setPic] = useState<number | null>(null);
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [like, setLike] = useState({ on: liked, n: r.likes });
  useEffect(() => setLike({ on: liked, n: r.likes }), [liked, r.likes]);
  const mine = user?.id === r.authorId;
  const refresh = () => qc.invalidateQueries({ queryKey: ["reviews", handle] });

  const toggle = async () => {
    if (!user) { toast.error("Sign in to like reviews"); return; }
    const on = !like.on;
    setLike({ on, n: like.n + (on ? 1 : -1) });
    try { await likeFn({ data: { id: r.id, like: on } }); qc.invalidateQueries({ queryKey: ["review-likes", handle] }); }
    catch { setLike({ on: !on, n: like.n }); }
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try { await replyFn({ data: { id: r.id, body: text } }); setText(""); setReplying(false); setShowAll(true); refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Couldn't reply"); }
    finally { setBusy(false); }
  };
  const replies = showAll ? r.replies : r.replies.slice(0, 2);

  return (
    <article id={`review-${r.id}`} className="scroll-mt-24 rounded-lg border border-border p-4 target:border-accent">
      <div className="flex flex-wrap items-center gap-2">
        <Stars value={r.rating} />
        {r.username ? <Link to="/u/$username" params={{ username: r.username }} className="text-sm font-semibold hover:underline">@{r.username}</Link> : <span className="text-sm font-semibold">{r.name}</span>}
        {r.userVerified && <VerifiedTick className="h-4 w-4" />}
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><BadgeCheck className="h-3.5 w-3.5" /> Verified buyer</span>
        <span className="ml-auto text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span>
      </div>
      {r.title && <h3 className="mt-2 text-sm font-semibold">{r.title}</h3>}
      {r.body && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{r.body}</p>}
      {r.pictures.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {r.pictures.map((src, i) => (
            <button key={src} onClick={() => setPic(i)} aria-label="Open photo">
              <img src={src} alt="Customer photo" loading="lazy" className="h-20 w-20 rounded-md object-cover" />
            </button>
          ))}
        </div>
      )}
      {pic !== null && <Lightbox pics={r.pictures} start={pic} onClose={() => setPic(null)} />}
      {r.reply && (
        <div className="mt-3 rounded-md bg-muted/70 px-3 py-2 text-sm">
          <span className="zk-label text-[10px]">ZANKYO replied</span>
          <p className="mt-1 whitespace-pre-line text-muted-foreground">{r.reply}</p>
        </div>
      )}
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <button onClick={toggle} className={`inline-flex min-h-9 items-center gap-1 ${like.on ? "text-accent" : ""}`}><ThumbsUp className={`h-4 w-4 ${like.on ? "fill-accent" : ""}`} /> Helpful{like.n ? ` (${like.n})` : ""}</button>
        {user ? <button onClick={() => setReplying(!replying)} className="inline-flex min-h-9 items-center gap-1"><MessageCircle className="h-4 w-4" /> Reply</button>
          : <Link to="/auth" search={{ next: `/product/${handle}#review-${r.id}` }} className="inline-flex min-h-9 items-center gap-1"><MessageCircle className="h-4 w-4" /> Reply</Link>}
        {mine && <button onClick={onEdit} className="inline-flex min-h-9 items-center gap-1"><Pencil className="h-3.5 w-3.5" /> Edit / delete</button>}
      </div>
      {r.replies.length > 0 && (
        <div className="mt-2 space-y-2 border-l-2 border-border pl-3">
          {replies.map((x) => (
            <div key={x.id} className="text-sm">
              {x.username ? <Link to="/u/$username" params={{ username: x.username }} className="font-semibold">@{x.username}</Link> : <b>{x.name}</b>}
              {x.verified && <VerifiedTick className="ml-1 h-3.5 w-3.5 align-[-2px]" />}
              <span className="ml-1.5 whitespace-pre-line break-words text-muted-foreground">{x.body}</span>
              {user?.id === x.userId && <button onClick={async () => { await delReplyFn({ data: { id: x.id } }); refresh(); }} className="ml-2 text-xs text-muted-foreground underline">Delete</button>}
            </div>
          ))}
          {r.replies.length > 2 && !showAll && <button onClick={() => setShowAll(true)} className="text-xs text-muted-foreground">View all {r.replies.length} replies</button>}
        </div>
      )}
      {replying && (
        <form onSubmit={send} className="mt-2 flex gap-2">
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Write a reply…" className="min-h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm" />
          <button disabled={busy || !text.trim()} className="zk-label rounded-full bg-foreground px-4 text-xs text-background disabled:opacity-50">{busy ? "…" : "Send"}</button>
        </form>
      )}
    </article>
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
      status === "not_purchased" ? "You can review this once your order is delivered." :
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
