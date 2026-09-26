import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { finishCustomerLogin } from "@/lib/customerAccount";
import { useCustomerStore } from "@/stores/customerStore";

export const Route = createFileRoute("/account/callback")({
  ssr: false,
  head: () => ({ meta: [{ title: "Signing in — ZANKYO" }, { name: "robots", content: "noindex" }] }),
  component: Callback,
});

function Callback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const code = p.get("code");
    const state = p.get("state");
    if (!code || !state) { setError("Sign-in was cancelled."); return; }
    (async () => {
      try {
        const { tokens, returnTo } = await finishCustomerLogin(code, state);
        await useCustomerStore.getState().setSession(tokens);
        navigate({ to: returnTo as "/account", replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Sign-in failed.");
      }
    })();
  }, [navigate]);
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4 text-center text-sm text-muted-foreground">
      {error ?? "Signing you in…"}
    </div>
  );
}
