import { useState } from "react";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1C3.4 21.4 7.4 24 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4V6.5h-4C.5 8.2 0 10 0 12s.5 3.8 1.4 5.5l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.5l4 3.1c.9-2.8 3.5-4.8 6.6-4.8z" />
    </svg>
  );
}

/** Google sign-in, or a 6-digit code sent by email. New emails get an account automatically. */
export function SignInPanel({ onDone }: { onDone?: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState<"google" | "send" | "verify" | null>(null);

  const google = async () => {
    setBusy("google");
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.href });
    if (res && "error" in res && res.error) toast.error(res.error.message || "Google sign-in failed");
    else if (!(res && "redirected" in res && res.redirected)) onDone?.();
    setBusy(null);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("send");
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
    setBusy(null);
    if (error) {
      toast.error(error.message.includes("disabled") ? "Email sign-in is switched off right now. Please use Google." : error.message);
      return;
    }
    setStep("code");
    toast.success(`We sent a 6-digit code to ${email.trim()}`);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("verify");
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
    setBusy(null);
    if (error) { toast.error("That code didn't work. Check it or send a new one."); return; }
    onDone?.();
  };

  const field = "min-h-12 w-full rounded-full border border-border bg-background px-5 text-base outline-none focus:border-foreground sm:text-sm";
  const primary = "zk-label flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-xs text-background active:opacity-80 disabled:opacity-60";

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={google}
        disabled={!!busy}
        className="zk-label flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-foreground text-xs active:opacity-80 disabled:opacity-60"
      >
        {busy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />} Continue with Google
      </button>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or use your email <span className="h-px flex-1 bg-border" />
      </div>
      {step === "email" ? (
        <form onSubmit={send} className="space-y-3">
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" aria-label="Email" className={field} />
          <button disabled={!!busy} className={primary}>
            {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Email me a code
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <p className="text-center text-xs text-muted-foreground">Enter the code we sent to <span className="text-foreground">{email}</span></p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            minLength={6}
            maxLength={10}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
            aria-label="Sign-in code"
            className={`${field} text-center tracking-[0.4em]`}
            autoFocus
          />
          <button disabled={!!busy} className={primary}>
            {busy === "verify" && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
          </button>
          <button type="button" onClick={() => { setStep("email"); setCode(""); }} className="mx-auto flex min-h-11 items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Use a different email
          </button>
        </form>
      )}
    </div>
  );
}
