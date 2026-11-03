import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, RotateCcw, Sparkles, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { TryOnZone } from "@/lib/tryon";

type Size = { id: string; title: string; available: boolean };

/** Photo fitting: AI garment swap (keeps face/pose/room, swaps only the detected zone) or a manual overlay. */
export function PhotoTryOnModal({
  open, onOpenChange, garment, title, sizes, selectedId, onSelect, onAdd, adding, zone: initialZone = "top",
}: {
  open: boolean; onOpenChange: (o: boolean) => void; garment: string | null; title: string;
  sizes: Size[]; selectedId: string | null; onSelect: (id: string) => void; onAdd: () => void; adding: boolean; zone?: TryOnZone;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [zone, setZone] = useState<TryOnZone>(initialZone);
  const [ai, setAi] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0.5, y: 0.42, scale: 0.55 });
  const [opacity, setOpacity] = useState(0.9);
  const stage = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; scale: number } | null>(null);

  useEffect(() => setZone(initialZone), [initialZone]);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);

  const pick = (f?: File) => {
    if (!f || !f.type.startsWith("image/")) return;
    setPhoto(URL.createObjectURL(f));
    setFile(f); setAi(null); setErr(null);
    setPos({ x: 0.5, y: 0.42, scale: initialZone === "bottom" ? 0.5 : 0.55 });
  };

  const generate = async () => {
    if (!file || !garment) return;
    setBusy(true); setErr(null);
    try {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { setErr("Please sign in to use AI try-on."); return; }
      const g = await fetch(garment).then((r) => r.blob());
      const fd = new FormData();
      fd.append("photo", file);
      fd.append("garment", new File([g], "garment.png", { type: g.type || "image/png" }));
      fd.append("zone", zone);
      fd.append("title", title);
      fd.append("size", sizes.find((x) => x.id === selectedId)?.title ?? "");
      const res = await fetch("/api/tryon", { method: "POST", headers: { Authorization: `Bearer ${s.session.access_token}` }, body: fd });
      const body = (await res.json().catch(() => ({}))) as { image?: string; error?: string };
      if (!res.ok || !body.image) setErr(body.error ?? "Couldn't create the try-on.");
      else setAi(body.image);
    } catch { setErr("Couldn't create the try-on. Check your connection."); }
    finally { setBusy(false); }
  };

  const onDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a!.x - b!.x, a!.y - b!.y), scale: pos.scale };
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    const r = stage.current?.getBoundingClientRect();
    if (!prev || !r) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      setPos((p) => ({ ...p, scale: clamp(pinch.current!.scale * (d / pinch.current!.d), 0.15, 1.6) }));
    } else if (pointers.current.size === 1) {
      setPos((p) => ({ ...p, x: clamp(p.x + (e.clientX - prev.x) / r.width, 0, 1), y: clamp(p.y + (e.clientY - prev.y) / r.height, 0, 1) }));
    }
  };
  const onUp = (e: React.PointerEvent) => { pointers.current.delete(e.pointerId); if (pointers.current.size < 2) pinch.current = null; };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-lg overflow-y-auto p-4 sm:p-6">
        <DialogTitle className="zk-display text-2xl">Photo fitting</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Add your photo — AI changes only the {zone === "bottom" ? "pants" : zone === "full" ? "outfit" : "top"} to {title}. Your face, pose and room stay the same.
        </DialogDescription>

        <div className="mt-1 flex gap-2" role="group" aria-label="What to change">
          {(["top", "bottom", "full"] as const).map((z) => (
            <button key={z} type="button" onClick={() => { setZone(z); setAi(null); }}
              className={`zk-label min-h-9 flex-1 rounded-full border px-3 text-[10px] ${zone === z ? "border-foreground bg-foreground text-background" : "border-border"}`}>
              {z === "top" ? "Top" : z === "bottom" ? "Pants / Lower" : "Full fit"}
            </button>
          ))}
        </div>

        {!photo ? (
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border text-sm hover:bg-muted">
              <Upload className="h-6 w-6" /> Upload photo
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
            <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border text-sm hover:bg-muted">
              <Camera className="h-6 w-6" /> Take a photo
              <input type="file" accept="image/*" capture="user" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
          </div>
        ) : ai ? (
          <div className="relative mt-2 aspect-[3/4] w-full overflow-hidden bg-ink">
            <img src={ai} alt={`You wearing ${title}`} className="h-full w-full object-contain" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-background/80 p-2 text-xs">
              <a href={ai} download="zankyo-tryon.png" className="underline">Save photo</a>
              <button type="button" onClick={() => setAi(null)} className="underline">Back to my photo</button>
            </div>
          </div>
        ) : (
          <>
            <div
              ref={stage}
              onWheel={(e) => setPos((p) => ({ ...p, scale: clamp(p.scale - e.deltaY * 0.001, 0.15, 1.6) }))}
              className="relative mt-2 aspect-[3/4] w-full touch-none select-none overflow-hidden bg-ink"
            >
              <img src={photo} alt="Your photo" className="h-full w-full object-contain" draggable={false} />
              {garment && !busy && (
                <img
                  src={garment} alt={title} draggable={false}
                  onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                  className="absolute cursor-move"
                  style={{ left: `${pos.x * 100}%`, top: `${(zone === "bottom" && pos.y === 0.42 ? 0.7 : pos.y) * 100}%`, width: `${pos.scale * 100}%`, opacity, transform: "translate(-50%, -50%)", mixBlendMode: "multiply" }}
                />
              )}
              {busy && (
                <div className="absolute inset-0 grid place-items-center bg-background/60 text-sm">
                  <span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Creating your fit… (up to a minute)</span>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <label className="zk-label text-[10px] text-muted-foreground" htmlFor="tryon-opacity">Fade</label>
              <input id="tryon-opacity" type="range" min={0.3} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="flex-1 accent-[hsl(var(--accent))]" />
              <button type="button" onClick={() => { setPhoto(null); setFile(null); setAi(null); }} className="flex min-h-9 items-center gap-1 text-xs underline"><RotateCcw className="h-3.5 w-3.5" /> New photo</button>
            </div>
            <button type="button" onClick={() => void generate()} disabled={busy || !garment}
              className="zk-label mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-foreground text-xs disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate real look with AI
            </button>
          </>
        )}
        {err && <p className="mt-2 text-sm text-destructive">{err}</p>}

        {sizes.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button key={s.id} type="button" disabled={!s.available} onClick={() => onSelect(s.id)}
                className={`min-h-10 min-w-11 rounded-lg border px-3 text-sm disabled:line-through disabled:opacity-40 ${selectedId === s.id ? "border-foreground bg-foreground text-background" : "border-border"}`}>
                {s.title}
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={onAdd} disabled={adding}
          className="zk-label mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-xs text-background disabled:opacity-60">
          {adding && <Loader2 className="h-4 w-4 animate-spin" />} Add to bag
        </button>
      </DialogContent>
    </Dialog>
  );
}

function clamp(n: number, a: number, b: number) { return Math.min(b, Math.max(a, n)); }
