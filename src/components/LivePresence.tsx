import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCartStore } from "@/stores/cartStore";
import { dismissNudge, presenceHeartbeat } from "@/lib/presence.functions";

type Nudge = { id: string; body: string; link: string | null };

/** Tells the store which page a signed-in customer is on, and shows personal messages from the team. */
export function LivePresence() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    if (!user) return;
    let stop = false;
    const ping = async () => {
      if (document.visibilityState !== "visible") return;
      const items = useCartStore.getState().items;
      try {
        const r = await presenceHeartbeat({
          data: {
            path: pathRef.current.slice(0, 200),
            device: window.innerWidth < 768 ? "Phone" : window.innerWidth < 1024 ? "Tablet" : "Laptop",
            cart: items.slice(0, 50).map((i) => ({
              title: i.product.node.title.slice(0, 120), variant: i.variantTitle.slice(0, 60),
              qty: Math.min(Math.max(i.quantity, 1), 99), price: Math.max(Number(i.price.amount) || 0, 0),
            })),
          },
        });
        if (!stop && r.nudges[0]) setNudge((n) => n ?? r.nudges[0]!);
      } catch { /* offline or signed out — try again next tick */ }
    };
    void ping();
    const t = setInterval(ping, 30_000);
    const vis = () => { if (document.visibilityState === "visible") void ping(); };
    document.addEventListener("visibilitychange", vis);
    return () => { stop = true; clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [user]);

  // Ping right away on page changes so admins see the current page.
  useEffect(() => { if (user) { const t = setTimeout(() => window.dispatchEvent(new Event("visibilitychange")), 400); return () => clearTimeout(t); } }, [pathname, user]);

  if (!nudge) return null;
  const close = () => { void dismissNudge({ data: { id: nudge.id } }).catch(() => {}); setNudge(null); };
  return (
    <div role="status" className="fixed inset-x-3 top-3 z-[100] mx-auto max-w-md animate-in fade-in slide-in-from-top-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Message from ZANKYO</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm">{nudge.body}</p>
          {nudge.link && <Link to={nudge.link} onClick={close} className="mt-3 inline-flex rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background">Open</Link>}
        </div>
        <button onClick={close} aria-label="Close message" className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
