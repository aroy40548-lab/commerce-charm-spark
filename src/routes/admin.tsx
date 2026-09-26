import { useState } from "react";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Package, Tags, ShoppingCart, Users, Percent, Settings, LogOut, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { ZankyoStar } from "@/components/ZankyoStar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ZANKYO Admin" },
      { name: "description", content: "ZANKYO store admin panel." },
      { property: "og:title", content: "ZANKYO Admin" },
      { property: "og:description", content: "ZANKYO store admin panel." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: Tags },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/discounts", label: "Discounts", icon: Percent },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

function AdminLayout() {
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);

  if (loading || (user && isAdmin === null)) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!user) return <AdminLogin />;
  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="zk-display text-3xl">No admin access</h1>
          <p className="mt-2 text-sm text-muted-foreground">{user.email} isn't an admin of this store.</p>
          <button onClick={() => supabase.auth.signOut()} className="mt-6 underline">Sign out</button>
        </div>
      </div>
    );
  }

  const storeUrl = typeof window !== "undefined" && window.location.hostname.startsWith("admin.") ? "https://zankyo.in" : "/";

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-background p-4 md:flex">
        <div className="flex items-center gap-2 px-2 py-3">
          <ZankyoStar className="h-5 w-5" />
          <span className="zk-display text-xl">ZANKYO</span>
          <span className="zk-label ml-auto rounded bg-muted px-1.5 py-0.5 text-[9px]">Admin</span>
        </div>
        <nav className="mt-4 flex-1 space-y-1">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted data-[status=active]:bg-foreground data-[status=active]:text-background">
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <a href={storeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground"><ExternalLink className="h-4 w-4" /> View store</a>
        <div className="border-t border-border pt-3 text-xs text-muted-foreground">
          <p className="truncate px-3">{user.email}</p>
          <button onClick={() => supabase.auth.signOut()} className="mt-2 flex items-center gap-3 px-3 py-2 text-sm hover:text-foreground"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <nav className="flex gap-2 overflow-x-auto border-b border-border bg-background p-2 md:hidden">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n }} className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs data-[status=active]:bg-foreground data-[status=active]:text-background">{n.label}</Link>
          ))}
        </nav>
        <div className="mx-auto max-w-6xl p-4 sm:p-8"><Outlet /></div>
      </div>
    </div>
  );
}

function AdminLogin() {
  const [busy, setBusy] = useState(false);
  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/admin` });
    if (result.error) { toast.error(result.error.message ?? "Google sign-in failed"); setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-background p-8">
        <div className="flex items-center gap-2"><ZankyoStar className="h-5 w-5" /><span className="zk-display text-xl">ZANKYO Admin</span></div>
        <p className="text-sm text-muted-foreground">Sign in with your admin Google account to manage your store.</p>
        <Button onClick={google} disabled={busy} className="zk-label h-11 w-full text-xs">
          {busy ? "Please wait…" : "Continue with Google"}
        </Button>
      </div>
    </div>
  );
}
