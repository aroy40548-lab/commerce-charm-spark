import { createFileRoute, Navigate } from "@tanstack/react-router";
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

function AuthPage() {
  const token = useCustomerToken();
  if (token) return <Navigate to="/account" replace />;
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 text-center">
      <ZankyoStar className="mx-auto h-8 w-8" />
      <h1 className="zk-display mt-4 text-4xl">Your account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Track orders and keep your saved items. We use a one-time code sent to your email — no password needed.
      </p>
      <button onClick={() => signIn("/account")} className="zk-label mt-8 w-full rounded-full bg-foreground py-3 text-xs text-background">
        Continue with email code
      </button>
      <p className="mt-4 text-xs text-muted-foreground">New here? Entering your email creates your account automatically.</p>
    </div>
  );
}
