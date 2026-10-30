import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { listDrops } from "@/lib/drops.functions";

export const Route = createFileRoute("/drops")({
  head: () => ({
    meta: [
      { title: "Upcoming Drops & Vault — ZANKYO" },
      { name: "description", content: "Countdown to the next ZANKYO streetwear drop. Join the VIP WhatsApp list for early access." },
      { property: "og:title", content: "Upcoming Drops & Vault — ZANKYO" },
      { property: "og:description", content: "Limited ZANKYO drops. Set your alarm, join VIP early access." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://zankyo.in/drops" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Drops,
});

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return now;
}

function Countdown({ at, now }: { at: string; now: number | null }) {
  const ms = Math.max(0, Date.parse(at) - (now ?? Date.parse(at)));
  const parts: Array<[number, string]> = [[Math.floor(ms / 864e5), "Days"], [Math.floor(ms / 36e5) % 24, "Hrs"], [Math.floor(ms / 6e4) % 60, "Min"], [Math.floor(ms / 1e3) % 60, "Sec"]];
  return (
    <div className="mt-4 grid grid-cols-4 gap-2">
      {parts.map(([n, l]) => (
        <div key={l} className="border border-border py-3 text-center">
          <div className="zk-display text-3xl tabular-nums">{now === null ? "--" : String(n).padStart(2, "0")}</div>
          <div className="zk-label text-[10px] text-muted-foreground">{l}</div>
        </div>
      ))}
    </div>
  );
}

function Drops() {
  const q = useQuery({ queryKey: ["drops"], queryFn: () => listDrops() });
  const now = useNow();
  const drops = q.data ?? [];
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="zk-label text-xs text-accent">The Vault</p>
      <h1 className="zk-display mt-1 text-5xl sm:text-6xl">Upcoming Drops</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">Limited runs. When it's gone, it's gone. Join VIP for early access before the public drop.</p>
      {q.isLoading && <Loader2 className="mt-10 h-6 w-6 animate-spin text-muted-foreground" />}
      {!q.isLoading && !drops.length && <p className="mt-12 text-sm text-muted-foreground">No drops announced right now. Follow us on Instagram so you don't miss the next one.</p>}
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {drops.map((d) => {
          const live = now !== null && Date.parse(d.drop_at) <= now;
          return (
            <article key={d.id} className="border border-border bg-card">
              {d.image_url && <img src={d.image_url} alt={d.title} loading="lazy" className={`aspect-[4/5] w-full object-cover ${live ? "" : "brightness-75"}`} />}
              <div className="p-4">
                <p className="zk-label text-[11px] text-muted-foreground">{new Date(d.drop_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
                <h2 className="zk-display mt-1 text-3xl">{d.title}</h2>
                {d.description && <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>}
                {live ? (
                  d.product_handle
                    ? <a href={`/product/${d.product_handle}`} className="zk-label mt-4 flex min-h-11 items-center justify-center bg-accent text-xs text-accent-foreground">Live now — Shop</a>
                    : <p className="zk-label mt-4 text-xs text-accent">Live now</p>
                ) : <Countdown at={d.drop_at} now={now} />}
                {!live && d.whatsapp_url && <a href={d.whatsapp_url} target="_blank" rel="noopener noreferrer" className="zk-label mt-3 flex min-h-11 items-center justify-center border border-foreground text-xs">Get VIP early access on WhatsApp</a>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
