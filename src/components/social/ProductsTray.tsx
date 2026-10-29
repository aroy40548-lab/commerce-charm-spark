import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/catalog";

export type TrayProduct = { handle: string; title: string; price: number; image: string | null };

/** One product: a direct chip. Two or more: a "pieces in this fit" pill that opens a sheet with every product. */
export function ProductsTray({ products, overlay = false }: { products: TrayProduct[]; overlay?: boolean }) {
  const [open, setOpen] = useState(false);
  const first = products[0];
  if (!first) return null;
  const box = overlay
    ? "border border-white/20 bg-black/60 text-white backdrop-blur-md"
    : "border border-border/70 bg-muted/40";
  const sub = overlay ? "text-white/80" : "text-muted-foreground";

  if (products.length === 1) {
    return (
      <Link to="/product/$handle" params={{ handle: first.handle }} className={`flex max-w-xs items-center gap-3 rounded-xl p-2 active:scale-[0.99] transition-transform ${box}`}>
        <Thumb src={first.image} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{first.title}</p>
          <p className={`text-xs ${sub}`}>{formatMoney(first.price)}</p>
        </div>
        <span className="zk-label rounded-full bg-accent px-3 py-1.5 text-[9px] text-accent-foreground">Shop</span>
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(true); }} className={`flex max-w-xs items-center gap-3 rounded-full py-1.5 pl-1.5 pr-4 active:scale-[0.98] transition-transform ${box}`}>
        <span className="flex -space-x-3">
          {products.slice(0, 3).map((p, i) => (
            <span key={p.handle + i} className="h-9 w-9 overflow-hidden rounded-full border-2 border-background bg-muted">
              {p.image && <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover" />}
            </span>
          ))}
        </span>
        <span className="text-left">
          <span className="block text-sm font-semibold leading-4">{products.length} pieces in this fit</span>
          <span className={`block text-[11px] ${sub}`}>Tap to shop all</span>
        </span>
        <ShoppingBag className="ml-1 h-4 w-4 text-accent" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Shop this fit</SheetTitle>
            <SheetDescription>{products.length} pieces tagged</SheetDescription>
          </SheetHeader>
          <ul className="mt-2 space-y-2 px-4 pb-6">
            {products.map((p, i) => (
              <li key={p.handle + i}>
                <Link to="/product/$handle" params={{ handle: p.handle }} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl border border-border p-2 active:opacity-80">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">{p.image && <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover" />}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.title}</p>
                    <p className="text-sm text-muted-foreground">{formatMoney(p.price)}</p>
                  </div>
                  <span className="zk-label rounded-full bg-accent px-3 py-1.5 text-[9px] text-accent-foreground">View</span>
                </Link>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Thumb({ src }: { src: string | null }) {
  return <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">{src && <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />}</div>;
}

/** Instagram-style loader shown over a video until it starts playing. */
export function VideoSpinner({ show }: { show: boolean }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-300 ${show ? "opacity-100" : "opacity-0"}`}>
      <span className="grid h-14 w-14 place-items-center rounded-full bg-black/40">
        <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-white/25 border-t-accent" />
      </span>
    </div>
  );
}
