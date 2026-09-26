import { useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Heart, Loader2, Mail, Truck } from "lucide-react";
import { ZankyoStar } from "@/components/ZankyoStar";
import { signIn, useCustomerToken } from "@/stores/customerStore";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — ZANKYO" },
      { name: "description", content: "Sign in to your ZANKYO account with a one-time email code to track orders and keep saved items." },
      { property: "og:title", content: "Sign in — ZANKYO" },
      { property: "og:description", content: "Sign in to your ZANKYO account." },
    ],
  }),
  component: AuthPage,
});

const STEPS = ["Enter your email", "Get a 6-digit code", "You're in — no password"];

function AuthPage() {
  const token = useCustomerToken();
  const [busy, setBusy] = useState(false);
  if (token) return <Navigate to="/account" replace />;

  const start = () => {
    setBusy(true);
    try {
      signIn("/account");
    } finally {
      setTimeout(() => setBusy(false), 4000);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10 sm:py-16">
      <div className="text-center">
        <ZankyoStar className="mx-auto h-8 w-8" />
        <h1 className="zk-display mt-4 text-3xl sm:text-4xl">Your account</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Sign in or create your account in seconds. No password to remember.
        </p>
      </div>

      <ol className="mt-7 space-y-2.5">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foreground text-xs font-semibold text-background">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 text-sm">{s}</span>
          </li>
        ))}
      </ol>

      <button
        onClick={start}
        disabled={busy}
        className="zk-label mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground py-3 text-xs text-background active:opacity-80 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        {busy ? "Opening secure sign in…" : "Continue with email code"}
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        New here? Entering your email creates your account automatically.
      </p>

      <div className="mt-8 grid gap-2.5">
        <Perk icon={<Truck className="h-4 w-4" />} title="Live order tracking" text="Follow every delivery from dispatch to your door." />
        <Perk icon={<Heart className="h-4 w-4" />} title="Saved items, everywhere" text="Your saved pieces follow you across phone and laptop." />
      </div>

      <Link
        to="/shop"
        search={{ q: undefined, category: undefined }}
        className="mt-6 block text-center text-sm underline underline-offset-4"
      >
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
