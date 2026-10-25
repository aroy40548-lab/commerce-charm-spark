import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Gift, Heart, Truck } from "lucide-react";
import { ZankyoStar } from "@/components/ZankyoStar";
import { SignInPanel } from "@/components/SignInPanel";
import { useAuth } from "@/hooks/useAuth";

type AuthSearch = { next?: string | undefined };

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): AuthSearch => ({
    next: typeof s["next"] === "string" && s["next"].startsWith("/") && !s["next"].startsWith("//") ? s["next"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — ZANKYO" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Sign in to your ZANKYO account with Google or a one-time email code to track orders and keep saved items." },
      { property: "og:title", content: "Sign in — ZANKYO" },
      { property: "og:description", content: "Sign in to your ZANKYO account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const { next } = Route.useSearch();

  // Full navigation so a #hash target (e.g. #reviews) is honoured.
  useEffect(() => {
    if (user) window.location.replace(next ?? "/account");
  }, [user, next]);

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10 sm:py-16">
      <div className="text-center">
        <ZankyoStar className="mx-auto h-8 w-8" />
        <h1 className="zk-display mt-4 text-3xl sm:text-4xl">Your account</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Sign in or create your account in seconds. No password to remember.
        </p>
      </div>

      <div className="mt-7">
        <SignInPanel />
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">New here? Signing in creates your account automatically.</p>

      <div className="mt-8 grid gap-2.5">
        <Perk icon={<Truck className="h-4 w-4" />} title="Live order tracking" text="Follow every delivery from dispatch to your door." />
        <Perk icon={<Heart className="h-4 w-4" />} title="Saved items, everywhere" text="Your saved pieces follow you across phone and laptop." />
        <Perk icon={<Gift className="h-4 w-4" />} title="Earn with your link" text="Share ZANKYO and earn commission on every order you bring in." />
      </div>

      <Link to="/shop" search={{ q: undefined, category: undefined }} className="mt-6 block text-center text-sm underline underline-offset-4">
        Back to shop
      </Link>
    </div>
  );
}

function Perk({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-muted/60 px-4 py-3">
      <span className="mt-0.5 shrink-0 text-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
