import { useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clapperboard, Heart, Home, MessageCircle, Plus, Search, UserRound } from "lucide-react";
import { BrandIcon } from "@/components/BrandLogo";
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
    <header className="sticky top-0 z-40 flex h-12 items-center gap-2 border-b border-border/60 bg-background/90 px-2 backdrop-blur-xl lg:hidden">
      <Link to="/" aria-label="Back to shop" className="grid h-10 w-10 place-items-center rounded-full active:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>
      <Link to="/social" aria-label="ZANKYO Social home" className="grid h-10 w-10 place-items-center"><BrandIcon className="h-8 w-8" /></Link>
      <div className="ml-auto flex items-center">
        <Link to="/search" aria-label="Search people" className="grid h-10 w-10 place-items-center rounded-full active:bg-muted"><Search className="h-5 w-5" /></Link>
        <Link to="/social/notifications" aria-label="Notifications" className="grid h-10 w-10 place-items-center rounded-full active:bg-muted"><span className="relative"><Heart className="h-5 w-5" /><Dot n={badges.data?.notifications} /></span></Link>
        <Link to="/social/inbox" aria-label="Messages" className="grid h-10 w-10 place-items-center rounded-full active:bg-muted"><span className="relative"><MessageCircle className="h-5 w-5" /><Dot n={badges.data?.chats} /></span></Link>
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
  const item = "relative flex h-full flex-1 flex-col items-center justify-center active:scale-90 transition-transform";
  const tab = (on: boolean) => `${item} ${on ? "text-foreground" : "text-muted-foreground"}`;
  const mark = (on: boolean) => on ? <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-accent" /> : null;
  const feedOn = pathname === "/social";
  const reelsOn = pathname.startsWith("/reels") && pathname !== "/reels/studio";
  const inboxOn = pathname.startsWith("/social/inbox");
  const profileOn = !!username && pathname === `/u/${username}`;
  return (
    <nav aria-label="Social tabs" className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-xl">
        <Link to="/social" aria-label="Feed" className={tab(feedOn)}><Home className="h-6 w-6" strokeWidth={feedOn ? 2.4 : 1.7} />{mark(feedOn)}</Link>
        <Link to="/reels" aria-label="Reels" className={tab(reelsOn)}><Clapperboard className="h-6 w-6" strokeWidth={reelsOn ? 2.4 : 1.7} />{mark(reelsOn)}</Link>
        <Link to="/social/new" aria-label="Create post" className={item}>
          <span className="grid h-10 w-12 place-items-center rounded-xl bg-accent text-accent-foreground shadow-[0_6px_20px_-6px_var(--accent)]"><Plus className="h-6 w-6" strokeWidth={2.6} /></span>
        </Link>
        <Link to="/social/inbox" aria-label="Messages" className={tab(inboxOn)}><span className="relative"><MessageCircle className="h-6 w-6" strokeWidth={inboxOn ? 2.4 : 1.7} /><Dot n={badges.data?.chats} /></span>{mark(inboxOn)}</Link>
        {user && username ? (
          <Link to="/u/$username" params={{ username }} aria-label="Profile" className={tab(profileOn)}>
            {me.data?.avatarUrl ? <img src={me.data.avatarUrl} alt="" className={`h-7 w-7 rounded-full object-cover ${profileOn ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`} /> : <UserRound className="h-6 w-6" />}
            {mark(profileOn)}
          </Link>
        ) : (
          <Link to="/auth" aria-label="Sign in" className={tab(false)}><UserRound className="h-6 w-6" /></Link>
        )}
      </div>
    </nav>
  );
}

/** Laptop header strip inside Social: notifications and messages. */
export function SocialDesktopBar() {
  const badges = useSocialBadges();
  return (
    <div className="hidden border-b border-border/60 lg:block">
      <div className="mx-auto flex h-12 max-w-5xl items-center gap-6 px-4">
        <Link to="/social" aria-label="ZANKYO Social home"><BrandIcon className="h-8 w-8" /></Link>
        <div className="ml-auto flex items-center gap-5 text-sm">
          <Link to="/search" className="flex items-center gap-2 hover:text-accent"><Search className="h-4 w-4" /> Search</Link>
          <Link to="/social/notifications" className="flex items-center gap-2 hover:text-accent"><span className="relative"><Heart className="h-4 w-4" /><Dot n={badges.data?.notifications} /></span> Notifications</Link>
          <Link to="/social/inbox" className="flex items-center gap-2 hover:text-accent"><span className="relative"><MessageCircle className="h-4 w-4" /><Dot n={badges.data?.chats} /></span> Messages</Link>
        </div>
      </div>
    </div>
  );
}
