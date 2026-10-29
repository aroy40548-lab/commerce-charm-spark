import { BrandLogo } from "@/components/BrandLogo";
import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3, Clapperboard, ExternalLink, FileText, Home, Inbox, Loader2, LogOut, Megaphone, Menu, MessageSquareQuote, Package,
  Moon, Percent, Settings, ShoppingCart, Sun, Users,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { SignInPanel } from "@/components/SignInPanel";
import { ZankyoStar } from "@/components/ZankyoStar";
import { StaffProvider } from "@/components/admin/ui";
import { signOut, useAuth } from "@/hooks/useAuth";
import { getAdminMe } from "@/lib/admin/core.functions";
import type { StaffSession } from "@/lib/admin/permissions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ZANKYO Admin" },
      { name: "description", content: "ZANKYO store admin." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

type NavItem = { to: string; label: string; icon: typeof Home; exact?: boolean; children?: Array<{ to: string; label: string }> };

const NAV: NavItem[] = [
  { to: "/admin", label: "Home", icon: Home, exact: true },
  { to: "/admin/orders", label: "Orders", icon: Inbox, children: [{ to: "/admin/orders/new", label: "Create order" }, { to: "/admin/abandoned", label: "Abandoned checkouts" }] },
  { to: "/admin/products", label: "Products", icon: Package, children: [{ to: "/admin/collections", label: "Collections" }, { to: "/admin/inventory", label: "Inventory" }, { to: "/admin/gift-cards", label: "Gift cards" }] },
  { to: "/admin/customers", label: "Customers", icon: Users, children: [{ to: "/admin/live", label: "Live visitors" }] },
  { to: "/admin/content", label: "Content", icon: FileText, children: [{ to: "/admin/blog", label: "Blog posts" }] },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/marketing", label: "Marketing", icon: Megaphone, children: [{ to: "/admin/marketing", label: "Affiliate Partners" }] },
  { to: "/admin/discounts", label: "Discounts", icon: Percent },
  { to: "/admin/reviews", label: "Reviews", icon: MessageSquareQuote },
  { to: "/admin/reels", label: "Social", icon: Clapperboard },
];

function AdminLayout() {
  const { user, loading } = useAuth();
  const me = useQuery({ queryKey: ["admin-me", user?.id], enabled: !!user, queryFn: () => getAdminMe(), staleTime: 60_000 });

  if (loading || (user && me.isLoading)) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!user) return <AdminLogin />;
  if (!me.data) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div className="max-w-sm">
          <ZankyoStar className="mx-auto h-8 w-8" />
          <h1 className="mt-4 text-2xl font-bold">No admin access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {me.isError ? "Couldn't check your access. Refresh to try again." : `${user.email} isn't on the ZANKYO team yet. Ask the store owner to add you in Settings → Staff.`}
          </p>
          <button onClick={() => signOut()} className="mt-6 text-sm underline">Sign out</button>
        </div>
      </div>
    );
  }
  return (
    <StaffProvider value={me.data}>
      <Shell me={me.data} />
    </StaffProvider>
  );
}

const THEME_KEY = "zankyo-admin-theme";
/** Admin theme: dark by default, remembered per device. Admin is client-only, so storage is safe to read here. */
function useAdminTheme() {
  const [dark, setDark] = useState(() => { try { return localStorage.getItem(THEME_KEY) !== "light"; } catch { return true; } });
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    root.classList.toggle("dark", dark);
    try { localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); } catch { /* private mode */ }
    return () => { if (!had) root.classList.remove("dark"); else root.classList.add("dark"); };
  }, [dark]);
  return [dark, () => setDark((d) => !d)] as const;
}

function ThemeButton({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function Shell({ me }: { me: StaffSession }) {
  const [open, setOpen] = useState(false);
  const [dark, toggleTheme] = useAdminTheme();
  const storeUrl = typeof window !== "undefined" && window.location.hostname.startsWith("admin.") ? "https://zankyo.in" : "/";
  return (
    <div className={`zk-hide-vton flex min-h-screen text-foreground ${dark ? "dark bg-background" : "bg-muted/40"}`}>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border bg-background lg:block">
        <Sidebar me={me} storeUrl={storeUrl} theme={<ThemeButton dark={dark} onToggle={toggleTheme} />} />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Admin menu</SheetTitle>
          <SheetDescription className="sr-only">Navigate the admin panel</SheetDescription>
          <Sidebar me={me} storeUrl={storeUrl} theme={<ThemeButton dark={dark} onToggle={toggleTheme} />} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background px-3 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-lg active:bg-muted"><Menu className="h-5 w-5" /></button>
          <BrandLogo className="w-24" />
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">Admin</span>
          <span className="ml-auto"><ThemeButton dark={dark} onToggle={toggleTheme} /></span>
        </header>
        <main className="mx-auto max-w-6xl px-3 py-5 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8"><Outlet /></main>
      </div>
    </div>
  );
}

function Sidebar({ me, storeUrl, onNavigate, theme }: { me: StaffSession; storeUrl: string; onNavigate?: () => void; theme?: React.ReactNode }) {
  const { pathname } = useLocation();
  const link = "flex min-h-9 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted data-[status=active]:bg-muted data-[status=active]:font-semibold data-[status=active]:text-foreground";
  return (
    <div className="flex h-full flex-col p-3">
      <div className="flex items-center gap-2 py-2 pl-2 pr-10 lg:pr-2">
        <BrandLogo className="w-28" />
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">Admin</span>
        {theme}
      </div>
      <nav className="mt-3 flex-1 space-y-0.5 overflow-y-auto">
        {NAV.map((n) => {
          const inside = pathname === n.to || pathname.startsWith(n.to + "/") || n.children?.some((c) => pathname.startsWith(c.to));
          return (
            <div key={n.to}>
              <Link to={n.to} activeOptions={{ exact: !!n.exact }} onClick={onNavigate} className={link}>
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
              {inside && n.children && n.children.some((c) => c.to !== n.to) && (
                <div className="ml-7 mt-0.5 space-y-0.5 border-l border-border pl-2">
                  {n.children.filter((c) => c.to !== n.to).map((c) => (
                    <Link key={c.to} to={c.to} activeOptions={{ exact: true }} onClick={onNavigate} className="flex min-h-8 items-center rounded-md px-2 text-[13px] text-muted-foreground hover:bg-muted data-[status=active]:font-semibold data-[status=active]:text-foreground">
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <p className="px-3 pb-1 pt-4 text-[11px] font-medium text-muted-foreground">Sales channels</p>
        <a href={storeUrl} target="_blank" rel="noreferrer" className={link}><ShoppingCart className="h-4 w-4" /> Online store <ExternalLink className="ml-auto h-3.5 w-3.5" /></a>
      </nav>
      <div className="border-t border-border pt-2">
        <Link to="/admin/settings" onClick={onNavigate} className={link}><Settings className="h-4 w-4" /> Settings</Link>
        <div className="mt-2 rounded-lg bg-muted/60 px-3 py-2">
          <p className="truncate text-xs font-semibold">{me.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{me.roleName}</p>
        </div>
        <button onClick={() => signOut()} className="mt-1 flex min-h-9 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted"><LogOut className="h-4 w-4" /> Sign out</button>
      </div>
    </div>
  );
}

function AdminLogin() {
  return (
    <div className="grid min-h-screen place-items-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-background p-6 sm:p-8">
        <div className="flex items-center gap-2"><ZankyoStar className="h-5 w-5" /><span className="zk-display text-xl">ZANKYO Admin</span></div>
        <p className="text-sm text-muted-foreground">Sign in with the email the store owner added you with.</p>
        <SignInPanel />
      </div>
    </div>
  );
}
