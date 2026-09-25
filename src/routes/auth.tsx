import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { ZankyoStar } from "@/components/ZankyoStar";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ZANKYO" },
      { name: "description", content: "Sign in or create your ZANKYO account with email or Google." },
      { property: "og:title", content: "Sign in — ZANKYO" },
      { property: "og:description", content: "Sign in or create your ZANKYO account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent to your email.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  };

  const title = mode === "signup" ? "Create account" : mode === "signin" ? "Sign in" : "Reset password";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <ZankyoStar className="mx-auto h-8 w-8" />
      <h1 className="zk-display mt-4 text-center text-4xl">{title}</h1>

      {mode !== "forgot" && (
        <>
          <button
            onClick={google}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border border-border py-3 text-sm font-medium hover:bg-muted"
          >
            Continue with Google
          </button>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={submit} className={`space-y-3 ${mode === "forgot" ? "mt-8" : ""}`}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-full border border-border bg-background px-5 py-3 text-sm outline-none focus:border-foreground"
        />
        {mode !== "forgot" && (
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-full border border-border bg-background px-5 py-3 text-sm outline-none focus:border-foreground"
          />
        )}
        <button
          disabled={busy}
          className="zk-label w-full rounded-full bg-foreground py-3 text-xs text-background disabled:opacity-50"
        >
          {busy ? "Please wait…" : title}
        </button>
      </form>

      <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
        {mode === "signin" && (
          <>
            <button onClick={() => setMode("forgot")} className="block w-full hover:text-foreground">Forgot password?</button>
            <button onClick={() => setMode("signup")} className="hover:text-foreground">New here? <u>Create an account</u></button>
          </>
        )}
        {mode !== "signin" && (
          <button onClick={() => setMode("signin")} className="hover:text-foreground">Already have an account? <u>Sign in</u></button>
        )}
      </div>
    </div>
  );
}
