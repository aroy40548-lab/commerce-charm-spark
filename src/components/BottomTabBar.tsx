import { Link, useLocation } from "@tanstack/react-router";
import { Clapperboard, Home, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";

export const OPEN_BAG_EVENT = "zk-open-bag";

/** Phone-only app-style tab bar: Home, Reels, Bag. */
export function BottomTabBar() {
  const { pathname } = useLocation();
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const item = "flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors active:opacity-70";
  const on = "text-accent";
  const off = "text-muted-foreground";
  const reels = pathname.startsWith("/reels");

  return (
    <nav
      aria-label="Main tabs"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="flex h-14">
        <Link to="/" className={`${item} ${pathname === "/" ? on : off}`}>
          <Home className="h-5 w-5" strokeWidth={pathname === "/" ? 2.4 : 1.6} />
          Home
        </Link>
        <Link to="/reels" className={`${item} ${reels ? on : off}`}>
          <Clapperboard className="h-5 w-5" strokeWidth={reels ? 2.4 : 1.6} />
          Reels
        </Link>
        <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_BAG_EVENT))} className={`${item} ${off} relative`}>
          <span className="relative">
            <ShoppingBag className="h-5 w-5" strokeWidth={1.6} />
            {count > 0 && (
              <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] text-accent-foreground">
                {count}
              </span>
            )}
          </span>
          Bag
        </button>
      </div>
    </nav>
  );
}
