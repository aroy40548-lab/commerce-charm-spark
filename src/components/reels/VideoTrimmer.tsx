import { useEffect, useRef, useState } from "react";

/** Dual-handle trimmer: previews only the chosen clip (start..end), max `max` seconds. */
export function VideoTrimmer({
  src, duration, max, value, onChange, soundUrl,
}: {
  src: string; duration: number; max: number; value: [number, number];
  onChange: (v: [number, number]) => void; soundUrl: string | null;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [start, end] = value;

  // Filmstrip: grab 8 frames from a hidden copy of the video.
  useEffect(() => {
    let cancelled = false;
    const v = document.createElement("video");
    v.muted = true; v.preload = "auto"; v.src = src;
    const out: string[] = [];
    const c = document.createElement("canvas");
    c.width = 48; c.height = 85;
    const grab = async () => {
      for (let i = 0; i < 8 && !cancelled; i++) {
        await new Promise<void>((res) => { v.onseeked = () => res(); v.currentTime = (duration * (i + 0.5)) / 8; });
        c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
        out.push(c.toDataURL("image/jpeg", 0.5));
      }
      if (!cancelled) setThumbs(out);
    };
    v.onloadeddata = () => void grab().catch(() => {});
    return () => { cancelled = true; v.src = ""; };
  }, [src, duration]);

  // Keep the preview looping inside the trimmed range.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.currentTime = start;
    if (audio.current) audio.current.currentTime = 0;
  }, [start]);

  const drag = (which: 0 | 1) => (e: React.PointerEvent) => {
    e.preventDefault();
    const el = bar.current;
    if (!el) return;
    const move = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const t = Math.min(duration, Math.max(0, ((ev.clientX - r.left) / r.width) * duration));
      let s = start, en = end;
      if (which === 0) { s = Math.min(t, en - 1); if (en - s > max) en = s + max; }
      else { en = Math.max(t, s + 1); if (en - s > max) s = en - max; }
      onChange([Math.max(0, s), Math.min(duration, en)]);
      if (video.current) video.current.currentTime = which === 0 ? s : Math.max(s, en - 0.5);
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const pct = (t: number) => `${(t / duration) * 100}%`;

  return (
    <div>
      <video
        ref={video} src={src} muted={!!soundUrl} autoPlay playsInline
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.currentTime >= end || v.currentTime < start - 0.3) { v.currentTime = start; if (audio.current) audio.current.currentTime = 0; }
        }}
        onPlay={() => void audio.current?.play().catch(() => {})}
        onPause={() => audio.current?.pause()}
        className="aspect-[9/16] w-full bg-ink object-cover"
      />
      {soundUrl && <audio ref={audio} src={soundUrl} loop preload="auto" />}
      <div ref={bar} className="relative mt-2 h-12 touch-none select-none overflow-hidden border border-border bg-muted">
        <div className="flex h-full">{thumbs.map((t, i) => <img key={i} src={t} alt="" className="h-full flex-1 object-cover" />)}</div>
        <div className="absolute inset-y-0 left-0 bg-background/70" style={{ width: pct(start) }} />
        <div className="absolute inset-y-0 right-0 bg-background/70" style={{ left: pct(end) }} />
        <div className="pointer-events-none absolute inset-y-0 border-y-2 border-accent" style={{ left: pct(start), width: `calc(${pct(end)} - ${pct(start)})` }} />
        <button type="button" aria-label="Trim start" onPointerDown={drag(0)} className="absolute inset-y-0 w-4 -translate-x-1/2 cursor-ew-resize bg-accent" style={{ left: pct(start) }} />
        <button type="button" aria-label="Trim end" onPointerDown={drag(1)} className="absolute inset-y-0 w-4 -translate-x-1/2 cursor-ew-resize bg-accent" style={{ left: pct(end) }} />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Drag the red handles · {start.toFixed(1)}s – {end.toFixed(1)}s</p>
    </div>
  );
}
