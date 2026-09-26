import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ZankyoStar } from "@/components/ZankyoStar";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

type AuthSearch = { next?: string | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): AuthSearch => ({
    next: typeof s["next"] === "string" && s["next"].startsWith("/") && !s["next"].startsWith("//") ? s["next"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — ZANKYO" },
      { name: "description", content: "Sign in to ZANKYO with Google to track orders and save addresses." },
      { property: "og:title", content: "Sign in — ZANKYO" },
      { property: "og:description", content: "Sign in to your ZANKYO account with Google." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const go = () => navigate({ to: (next ?? "/account") as "/account" });
    supabase.auth.getSession().then(({ data }) => { if (data.session) go(); });
    const { data } = supabase.auth.onAuthStateChange((evt, session) => {
      if (evt === "SIGNED_IN" && session) go();
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, next]);

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth` });
    if (result.error) { toast.error(result.error.message ?? "Google sign-in failed"); setBusy(false); }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <ZankyoStar className="mx-auto h-8 w-8" />
      <h1 className="zk-display mt-4 text-center text-4xl">Sign in</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">Use your Google account to shop, track orders and save addresses.</p>
      <button onClick={google} disabled={busy} className="zk-label mt-8 w-full rounded-full bg-foreground py-3 text-xs text-background disabled:opacity-50">
        {busy ? "Please wait…" : "Continue with Google"}
      </button>
    </div>
  );
}
