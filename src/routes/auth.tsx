import { createFileRoute } from "@tanstack/react-router";
import { ZankyoStar } from "@/components/ZankyoStar";
import { openShopifyAccount } from "@/stores/customerStore";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — ZANKYO" },
      { name: "description", content: "Sign in to your ZANKYO account with a one-time email code to track orders and save addresses." },
      { property: "og:title", content: "Sign in — ZANKYO" },
      { property: "og:description", content: "Sign in to your ZANKYO account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 text-center">
      <ZankyoStar className="mx-auto h-8 w-8" />
      <h1 className="zk-display mt-4 text-4xl">Your account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Track orders, save addresses and keep your saved items. We use a one-time code sent to your email — no password needed.
      </p>
      <button
        onClick={openShopifyAccount}
        className="zk-label mt-8 w-full rounded-full bg-foreground py-3 text-xs text-background"
      >
        Continue with email code
      </button>
      <p className="mt-4 text-xs text-muted-foreground">
        You'll be taken to our secure sign-in page. New here? Entering your email there creates your account automatically.
      </p>
    </div>
  );
}
