import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, User, Heart, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CartDrawer } from "@/components/CartDrawer";
import { ZankyoStar } from "@/components/ZankyoStar";
import { useWishlistStore } from "@/stores/wishlistStore";
import { formatMoney } from "@/lib/shopify";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/collections", label: "Collections" },
  { to: "/lookbook", label: "Lookbook" },
  { to: "/about", label: "About" },
] as const;

function WishlistSheet() {
  const items = useWishlistStore((s) => s.items);
  const remove = useWishlistStore((s) => s.remove);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          aria-label="Wishlist"
          className="relative grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-muted"
        >
          <Heart className="h-5 w-5" strokeWidth={1.6} />
          {items.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
              {items.length}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="zk-label text-sm">Wishlist</SheetTitle>
          <SheetDescription>Saved pieces stay here on this device.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3 overflow-y-auto">
          {items.length === 0 && <p className="text-sm text-muted-foreground">No saved pieces yet.</p>}
          {items.map((item) => (
            <div key={item.handle} className="flex items-center gap-3">
              <div className="h-16 w-16 overflow-hidden rounded-lg bg-card">
                {item.image && <img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <Link to="/product/$handle" params={{ handle: item.handle }} className="block truncate text-sm">
                  {item.title}
                </Link>
                <p className="text-xs text-muted-foreground">{formatMoney(item.price, item.currencyCode)}</p>
              </div>
              <button onClick={() => remove(item.handle)} aria-label="Remove" className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AccountSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button aria-label="Account" className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-muted">
          <User className="h-5 w-5" strokeWidth={1.6} />
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="zk-label text-sm">Orders</SheetTitle>
          <SheetDescription>Order confirmations and tracking are emailed by ZANKYO after checkout.</SheetDescription>
        </SheetHeader>
        <p className="mt-4 text-sm text-muted-foreground">
          You can check out as a guest — no account needed. Use the email you checked out with to track your order.
        </p>
      </SheetContent>
    </Sheet>
  );
}

export function Navbar() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <ZankyoStar className="h-6 w-6 text-foreground" />
          <span className="zk-display text-2xl leading-none">ZANKYO</span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-7 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-b-2 data-[status=active]:border-foreground data-[status=active]:pb-0.5 data-[status=active]:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/shop", search: { q: query || undefined, category: undefined } });
            }}
            className="hidden items-center gap-2 rounded-full border border-border px-4 py-2 md:flex"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for products..."
              className="w-44 bg-transparent text-sm outline-none placeholder:text-muted-foreground lg:w-56"
            />
          </form>
          <AccountSheet />
          <WishlistSheet />
          <CartDrawer />
        </div>
      </div>

      <nav className="flex items-center gap-5 overflow-x-auto border-t border-border px-4 py-2 lg:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === "/" }}
            className="whitespace-nowrap text-sm text-muted-foreground data-[status=active]:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
