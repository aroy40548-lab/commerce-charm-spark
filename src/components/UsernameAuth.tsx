import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { signInWithUsername, signUpWithUsername } from "@/lib/account.functions";

const inputCls = "w-full rounded-full border border-border bg-background px-5 py-3 text-sm outline-none focus:border-foreground";

export function UsernameAuth({ redirectPath, googleOnly = false }: { redirectPath: string; googleOnly?: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const signIn = useServerFn(signInWithUsername);
  const signUp = useServerFn(signUpWithUsername);

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}${redirectPath}` });
    if (result.error) { toast.error(result.error.message ?? "Google sign-in failed"); setBusy(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const tokens = mode === "signup"
        ? await signUp({ data: { username, email, password } })
        : await signIn({ data: { username, password } });
      const { error } = await supabase.auth.setSession(tokens);
      if (error) throw error;
      toast.success(mode === "signup" ? "Welcome to ZANKYO!" : "Welcome back!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg.startsWith("[") ? "Please check your details" : msg);
    } finally { setBusy(false); }
  };

  return (
    <div>
      <button type="button" onClick={google} disabled={busy} className="zk-label w-full rounded-full border border-border py-3 text-xs hover:bg-muted disabled:opacity-50">
        Continue with Google
      </button>
      {!googleOnly && (
        <>
          <p className="my-4 text-center text-xs text-muted-foreground">or use your username</p>
          <form onSubmit={submit} className="space-y-3">
            <input required value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="Username" autoComplete="username" className={inputCls} />
            {mode === "signup" && (
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputCls} />
            )}
            <input type="password" required minLength={mode === "signup" ? 8 : 1} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete={mode === "signup" ? "new-password" : "current-password"} className={inputCls} />
            <button disabled={busy} className="zk-label w-full rounded-full bg-foreground py-3 text-xs text-background disabled:opacity-50">
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>
          <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-5 w-full text-center text-sm text-muted-foreground hover:text-foreground">
            {mode === "signin" ? <>New here? <u>Create an account</u></> : <>Already have an account? <u>Sign in</u></>}
          </button>
        </>
      )}
    </div>
  );
}
