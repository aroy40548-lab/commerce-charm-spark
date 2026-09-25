import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ZankyoStar } from "@/components/ZankyoStar";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

type AuthSearch = { next?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): AuthSearch => ({
    next: typeof s["next"] === "string" && s["next"].startsWith("/") && !s["next"].startsWith("//") ? s["next"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — ZANKYO" },
      { name: "description", content: "Sign in or create your ZANKYO account to track orders and save addresses." },
      { property: "og:title", content: "Sign in — ZANKYO" },
      { property: "og:description", content: "Sign in or create your ZANKYO account." },
    ],
  }),
  component: AuthPage,
});

const inputCls =
  "w-full rounded-full border border-border bg-background px-5 py-3 text-sm outline-none focus:border-foreground";

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "reset">("signin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const go = () => navigate({ to: (next ?? "/account") as "/account" });

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setMode("reset");
    const { data } = supabase.auth.onAuthStateChange((evt, session) => {
      if (evt === "PASSWORD_RECOVERY") setMode("reset");
      else if (evt === "SIGNED_IN" && session && !window.location.hash.includes("type=recovery")) go();
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/auth`, data: { first_name: firstName, last_name: lastName } },
        });
        if (error) throw error;
        if (data.session) { toast.success("Welcome to ZANKYO!"); go(); }
        else { toast.success("Check your inbox to confirm your email, then sign in."); setMode("signin"); }
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        go();
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth` });
        if (error) throw error;
        toast.success("If that email has an account, a reset link is on its way.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Password updated");
        window.history.replaceState(null, "", window.location.pathname);
        go();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth` });
    if (result.error) toast.error(result.error.message ?? "Google sign-in failed");
  };

  const title = { signup: "Create account", signin: "Sign in", forgot: "Reset password", reset: "Set new password" }[mode];

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <ZankyoStar className="mx-auto h-8 w-8" />
      <h1 className="zk-display mt-4 text-center text-4xl">{title}</h1>

      {(mode === "signin" || mode === "signup") && (
        <>
          <button onClick={google} className="zk-label mt-8 w-full rounded-full border border-border py-3 text-xs hover:bg-muted">
            Continue with Google
          </button>
          <p className="mt-4 text-center text-xs text-muted-foreground">or use your email</p>
        </>
      )}

      <form onSubmit={submit} className="mt-4 space-y-3">
        {mode === "signup" && (
          <div className="flex gap-3">
            <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className={inputCls} />
            <input required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className={inputCls} />
          </div>
        )}
        {mode !== "reset" && (
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputCls} />
        )}
        {mode !== "forgot" && (
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "reset" ? "New password" : "Password"} className={inputCls} />
        )}
        <button disabled={busy} className="zk-label w-full rounded-full bg-foreground py-3 text-xs text-background disabled:opacity-50">
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
        {(mode === "signup" || mode === "forgot") && (
          <button onClick={() => setMode("signin")} className="hover:text-foreground">Already have an account? <u>Sign in</u></button>
        )}
      </div>
    </div>
  );
}
