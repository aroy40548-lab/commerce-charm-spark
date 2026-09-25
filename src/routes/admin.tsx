import { useState } from "react";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Package, Tags, ShoppingCart, Users, Percent, Settings, LogOut, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { ZankyoStar } from "@/components/ZankyoStar";

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
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const cls = "w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
        if (error) throw error;
        if (!data.session) { toast.success("Check your inbox to confirm your email, then sign in."); setMode("signin"); }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth` });
        if (error) throw error;
        toast.success("Reset link sent if the account exists.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-background p-8">
        <div className="flex items-center gap-2"><ZankyoStar className="h-5 w-5" /><span className="zk-display text-xl">ZANKYO Admin</span></div>
        <p className="pb-2 text-sm text-muted-foreground">{mode === "signup" ? "Create your admin login" : mode === "forgot" ? "Reset your password" : "Sign in to manage your store"}</p>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={cls} />
        {mode !== "forgot" && <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className={cls} />}
        <button disabled={busy} className="zk-label w-full rounded-lg bg-foreground py-3 text-xs text-background disabled:opacity-50">
          {busy ? "Please wait…" : mode === "signup" ? "Create login" : mode === "forgot" ? "Send reset link" : "Sign in"}
        </button>
        <div className="flex justify-between pt-2 text-xs text-muted-foreground">
          {mode === "signin" ? (
            <>
              <button type="button" onClick={() => setMode("signup")} className="underline">First time? Create login</button>
              <button type="button" onClick={() => setMode("forgot")} className="underline">Forgot password</button>
            </>
          ) : (
            <button type="button" onClick={() => setMode("signin")} className="underline">Back to sign in</button>
          )}
        </div>
      </form>
    </div>
  );
}
