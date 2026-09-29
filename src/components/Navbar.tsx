import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, User, Heart, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CartDrawer } from "@/components/CartDrawer";
import { useWishlistStore } from "@/stores/wishlistStore";
import { formatMoney } from "@/lib/catalog";
import { useCustomerStore, useCustomerToken } from "@/stores/customerStore";
import compactLightLogo from "@/assets/zankyo-compact-light.png.asset.json";
import compactDarkLogo from "@/assets/zankyo-compact-dark.png.asset.json";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/collections", label: "Collections" },
  { to: "/unboxing", label: "UNBOXING // 001" },
  { to: "/about", label: "About" },
] as const;

function WishlistSheet() {
  const items = useWishlistStore((s) => s.items);
  const remove = useWishlistStore((s) => s.remove);
  const signedIn = !!useCustomerToken();

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
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="zk-label text-sm">Saved items</SheetTitle>
          <SheetDescription>
            {signedIn ? "Saved to your account." : "Saved on this phone only."}
          </SheetDescription>
        </SheetHeader>

        {signedIn ? (
          <p className="zk-label mt-3 inline-flex w-fit items-center rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">
            Synced with your account
          </p>
        ) : (
          <div className="mt-3 rounded-2xl bg-muted/70 p-3">
            <p className="text-xs leading-5 text-muted-foreground">
              Sign in with your email code to keep these on every device.
            </p>
            <Link
              to="/auth"
              className="zk-label mt-2.5 flex min-h-10 items-center justify-center rounded-full bg-foreground text-[11px] text-background active:opacity-80"
            >
              Sign in
            </Link>
          </div>
        )}

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
          {items.length === 0 && <p className="text-sm text-muted-foreground">No saved pieces yet.</p>}
          {items.map((item) => (
            <div key={item.handle} className="flex items-center gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-card">
                {item.image && <img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <Link to="/product/$handle" params={{ handle: item.handle }} className="block truncate text-sm">
                  {item.title}
                </Link>
                <p className="text-xs text-muted-foreground">{formatMoney(item.price, item.currencyCode)}</p>
              </div>
              <button
                onClick={() => remove(item.handle)}
                aria-label={`Remove ${item.title}`}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground active:bg-muted"
              >
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
  const signedIn = !!useCustomerToken();
  const email = useCustomerStore((s) => s.profile?.firstName || s.email);

  return (
    <Link
      to={signedIn ? "/account" : "/auth"}
      aria-label={signedIn ? "My account" : "Sign in"}
      className={`grid h-9 w-9 place-items-center rounded-full transition-colors ${signedIn ? "bg-foreground text-background" : "hover:bg-muted"}`}
    >
      {signedIn ? (
        <span className="text-xs font-semibold uppercase">{email?.[0] ?? "U"}</span>
      ) : (
        <User className="h-5 w-5" strokeWidth={1.6} />
      )}
    </Link>
  );
}

export function Navbar() {
  const [query, setQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const navigate = useNavigate();

  const submitSearch = () => {
    navigate({ to: "/shop", search: { q: query || undefined, category: undefined } });
    setMobileSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto grid h-16 max-w-[1600px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 sm:px-6 lg:flex lg:gap-6">
        <Link to="/" className="flex min-w-0 items-center" aria-label="ZANKYO home">
          <img
            src={compactLightLogo.url}
            alt="ZANKYO 残響"
            width={700}
            height={176}
            className="h-auto w-[132px] object-contain sm:w-40 dark:hidden"
          />
          <img
            src={compactDarkLogo.url}
            alt=""
            aria-hidden="true"
            width={700}
            height={176}
            className="hidden h-auto w-[132px] object-contain sm:w-40 dark:block"
          />
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

        <div className="flex shrink-0 items-center gap-0.5 sm:ml-auto sm:gap-1 lg:gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
                submitSearch();
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
          <button
            type="button"
            aria-label={mobileSearchOpen ? "Close search" : "Search"}
            aria-expanded={mobileSearchOpen}
            onClick={() => setMobileSearchOpen((open) => !open)}
            className="grid h-11 w-11 place-items-center rounded-full transition-colors active:bg-muted md:hidden"
          >
            {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
          <AccountSheet />
          <WishlistSheet />
          <CartDrawer />
        </div>
      </div>

      {mobileSearchOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitSearch();
          }}
          className="border-t border-border px-4 py-3 md:hidden"
        >
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-full border border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products"
              aria-label="Search products"
              className="h-11 min-w-0 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <button type="submit" className="zk-label h-11 shrink-0 px-2 text-[10px]">Search</button>
          </div>
        </form>
      )}

      <nav className="mobile-scroll-hint flex items-center gap-1 overflow-x-auto border-t border-border px-3 py-1 lg:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === "/" }}
            className="flex h-10 shrink-0 items-center whitespace-nowrap px-3 text-sm text-muted-foreground data-[status=active]:font-semibold data-[status=active]:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
