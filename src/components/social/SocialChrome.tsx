import { useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clapperboard, Heart, Home, MessageCircle, PlusSquare, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyProfile } from "@/components/ProfileEditor";
import { socialBadges } from "@/lib/social.functions";

export function isSocialPath(p: string) {
  return p === "/social" || p.startsWith("/social/") || p === "/reels" || p.startsWith("/reels/") || p.startsWith("/u/") || p.startsWith("/p/") || p === "/search";
}

export function useSocialBadges() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["social-badges", user?.id], enabled: !!user, queryFn: () => socialBadges(), staleTime: 30_000 });
}

/** One live connection per signed-in visitor: new notifications and messages refresh the right screens. */
export function SocialRealtime() {
  const { user } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`social-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["social-badges"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (p) => {
        const conv = (p.new as { conversation_id?: string } | null)?.conversation_id;
        qc.invalidateQueries({ queryKey: ["social-badges"] });
        qc.invalidateQueries({ queryKey: ["chats"] });
        if (conv) qc.invalidateQueries({ queryKey: ["chat", conv] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user?.id, qc]);
  return null;
}

const Dot = ({ n }: { n: number | undefined }) =>
  n ? <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground">{n > 9 ? "9+" : n}</span> : null;

/** Phone top bar inside Social (hidden on the full-screen reel viewer). */
export function SocialTopBar() {
  const badges = useSocialBadges();
  return (
    <header className="sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur-md lg:hidden">
      <Link to="/" aria-label="Back to shop" className="grid h-10 w-10 place-items-center"><ArrowLeft className="h-5 w-5" /></Link>
      <Link to="/social" className="zk-display text-2xl leading-none tracking-wide">ZANKYO <span className="text-accent">Social</span></Link>
      <div className="ml-auto flex items-center gap-1">
        <Link to="/social/notifications" aria-label="Notifications" className="relative grid h-10 w-10 place-items-center"><span className="relative"><Heart className="h-5 w-5" /><Dot n={badges.data?.notifications} /></span></Link>
        <Link to="/social/inbox" aria-label="Messages" className="relative grid h-10 w-10 place-items-center"><span className="relative"><MessageCircle className="h-5 w-5" /><Dot n={badges.data?.chats} /></span></Link>
      </div>
    </header>
  );
}

export function SocialTabBar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const me = useMyProfile();
  const badges = useSocialBadges();
  const username = me.data?.username;
  const item = "relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] active:opacity-70";
  const tab = (on: boolean) => `${item} ${on ? "text-accent" : "text-muted-foreground"}`;
  const profileOn = !!username && pathname === `/u/${username}`;
  return (
    <nav aria-label="Social tabs" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-xl">
        <Link to="/social" className={tab(pathname === "/social")}><Home className="h-5 w-5" />Feed</Link>
        <Link to="/reels" className={tab(pathname.startsWith("/reels") && pathname !== "/reels/studio")}><Clapperboard className="h-5 w-5" />Reels</Link>
        <Link to="/social/new" className={tab(pathname === "/social/new" || pathname === "/reels/studio")}><PlusSquare className="h-6 w-6" />Post</Link>
        <Link to="/social/inbox" className={tab(pathname.startsWith("/social/inbox"))}><span className="relative"><MessageCircle className="h-5 w-5" /><Dot n={badges.data?.chats} /></span>Inbox</Link>
        {user && username ? (
          <Link to="/u/$username" params={{ username }} className={tab(profileOn)}><UserRound className="h-5 w-5" />Profile</Link>
        ) : (
          <Link to="/auth" className={tab(false)}><UserRound className="h-5 w-5" />Profile</Link>
        )}
      </div>
    </nav>
  );
}

/** Laptop header strip inside Social: notifications and messages. */
export function SocialDesktopBar() {
  const badges = useSocialBadges();
  return (
    <div className="hidden border-b border-border lg:block">
      <div className="mx-auto flex h-12 max-w-5xl items-center gap-6 px-4">
        <Link to="/social" className="zk-display text-2xl">ZANKYO <span className="text-accent">Social</span></Link>
        <div className="ml-auto flex items-center gap-5 text-sm">
          <Link to="/search" className="hover:text-accent">Search</Link>
          <Link to="/social/notifications" className="relative flex items-center gap-2 hover:text-accent"><span className="relative"><Heart className="h-4 w-4" /><Dot n={badges.data?.notifications} /></span> Notifications</Link>
          <Link to="/social/inbox" className="relative flex items-center gap-2 hover:text-accent"><span className="relative"><MessageCircle className="h-4 w-4" /><Dot n={badges.data?.chats} /></span> Messages</Link>
        </div>
      </div>
    </div>
  );
}
